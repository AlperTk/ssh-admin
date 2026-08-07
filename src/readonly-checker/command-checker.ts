import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tokenize, getFirstToken } from '../tokenizer.js';
import { gitHasWriteArg } from './write-handlers/git-handler.js';
import { dockerHasWriteArg } from './write-handlers/docker-handler.js';
import { systemctlHasWriteArg } from './write-handlers/systemctl-handler.js';
import { curlWgetHasWriteArg } from './write-handlers/curl-wget-handler.js';
import { ipHasWriteArg } from './write-handlers/ip-handler.js';
import { aptHasWriteArg } from './write-handlers/apt-handler.js';
import { crontabHasWriteArg } from './write-handlers/crontab-handler.js';
import { firewallCmdHasWriteArg } from './write-handlers/firewall-cmd-handler.js';
import { rsyncHasWriteArg } from './write-handlers/rsync-handler.js';
import { mktempHasWriteArg } from './write-handlers/mktemp-handler.js';
import { fail2banHasWriteArg } from './write-handlers/fail2ban-handler.js';
import { journalctlHasWriteArg } from './write-handlers/journalctl-handler.js';
import { awkHasWriteArg } from './write-handlers/awk-handler.js';
import { WritePatternDetector } from './write-patterns/write-pattern-detector.js';
import { resolveCommand, getFirstToken as resolverGetFirstToken } from './resolution/command-resolver.js';
import { extractLoopBody } from './parsing/loop-extractor.js';
import { checkSubstitutions } from './parsing/substitution-detector.js';
import { SHELL_PATTERNS } from '../data/readonly-rules.js';

export interface CheckResult {
  allowed: boolean;
  reason?: string;
  blockedCommand?: string;
  matchedRule?: string;
  matchedText?: string;
  segmentIndex?: number;
}

type WriteHandlerFn = (cmd: string) => boolean;

const SEGMENT_SEPARATORS = ['&&', '||', ';'];
const PIPE_SEPARATOR = '|';

const SEGMENT_OPTIONS = {
  separators: SEGMENT_SEPARATORS,
  depthChar: { open: '(', close: ')' },
  secondaryDepthChar: { open: '{', close: '}' },
};

const PIPE_OPTIONS = {
  separators: [PIPE_SEPARATOR],
  depthChar: { open: '(', close: ')' },
};

export class CommandChecker {
  private readonly whitelist: Set<string>;
  private readonly handlers: Map<string, WriteHandlerFn>;
  private readonly patternDetector: WritePatternDetector;

  constructor() {
    // Singleton: bir kez oku, bir kez cache'le
    // __dirname kaynakta src/readonly-checker/, bundle'da dist/
    let whitelistPath = join(__dirname, 'data', 'readonly-whitelist.json');
    if (!existsSync(whitelistPath)) {
      whitelistPath = join(__dirname, '..', 'data', 'readonly-whitelist.json');
    }
    const whitelistData = JSON.parse(readFileSync(whitelistPath, 'utf-8'));
    this.whitelist = new Set(whitelistData.commands);

    // Direct dispatch map — O(1) routing
    this.handlers = new Map([
      ['git', gitHasWriteArg],
      ['docker', dockerHasWriteArg],
      ['systemctl', systemctlHasWriteArg],
      ['curl', curlWgetHasWriteArg],
      ['wget', curlWgetHasWriteArg],
      ['ip', ipHasWriteArg],
      ['apt', aptHasWriteArg],
      ['crontab', crontabHasWriteArg],
      ['firewall-cmd', firewallCmdHasWriteArg],
      ['rsync', rsyncHasWriteArg],
      ['mktemp', mktempHasWriteArg],
      ['fail2ban-client', fail2banHasWriteArg],
      ['journalctl', journalctlHasWriteArg],
      ['awk', awkHasWriteArg],
    ]);

    this.patternDetector = new WritePatternDetector();
  }

  check(command: string): CheckResult {
    if (!command.trim()) return { allowed: true };

    // 1. Substitution detection → recursive check
    const subResult = checkSubstitutions(command, (inner) => this.check(inner));
    if (subResult && !subResult.allowed) return subResult;

    // 2. Loop extraction → recursive check
    const loopBody = extractLoopBody(command);
    if (loopBody !== null) return this.check(loopBody);

    // 3. Segment parsing
    const segments = tokenize(command, SEGMENT_OPTIONS);

    for (const seg of segments) {
      const trimmed = seg.trim();
      if (!trimmed) continue;

      // 3a. Subshell/brace expansion → recursive check
      const subshellContent = this.extractSubshellContent(trimmed);
      if (subshellContent !== null) {
        const result = this.check(subshellContent);
        if (!result.allowed) return result;
        continue;
      }

      const braceContent = this.extractBraceContent(trimmed);
      if (braceContent !== null) {
        const result = this.check(braceContent);
        if (!result.allowed) return result;
        continue;
      }

      // 3b. Pipe segment parsing
      const pipeSegments = tokenize(trimmed, PIPE_OPTIONS);
      let segIdx = 0;
      for (const pipeSeg of pipeSegments) {
        segIdx++;
        const pTrimmed = pipeSeg.trim();
        if (!pTrimmed) continue;

        // Process substitution check
        const psResult = this.checkProcessSubstitution(pTrimmed);
        if (!psResult.allowed) return psResult;

        // Command resolution (sudo/su/ssh peel-through)
        const resolved = resolveCommand(pTrimmed);
        const cmd = resolverGetFirstToken(resolved);

        // 3c. WHITELIST CHECK — O(1), early exit
        if (!this.whitelist.has(cmd)) {
          return { allowed: false, reason: `Command '${cmd}' is not in the read-only whitelist`, blockedCommand: cmd, segmentIndex: segIdx };
        }

        // 3d. eval/exec özel validation
        if (cmd === 'eval') {
          const evalResult = this.validateEvalArgs(pTrimmed);
          if (evalResult) return evalResult;
        }
        if (cmd === 'exec') {
          const execResult = this.validateExecArgs(pTrimmed);
          if (execResult) return execResult;
        }

        // 3e. DIRECT DISPATCH — O(1), no iteration
        const handler = this.handlers.get(cmd);
        if (handler && handler(pTrimmed)) {
          return { allowed: false, reason: `Write argument detected in command`, blockedCommand: cmd, matchedRule: `${cmd} write arg`, segmentIndex: segIdx };
        }

        // 3f. Write pattern detection
        const patternResult = this.patternDetector.detect(pTrimmed);
        if (patternResult.ok) {
          return { allowed: false, reason: `Write pattern detected in command`, blockedCommand: cmd, matchedRule: patternResult.debug?.rule, matchedText: patternResult.debug?.text, segmentIndex: segIdx };
        }
      }
    }

    return { allowed: true };
  }

  private extractSubshellContent(segment: string): string | null {
    const match = segment.match(/^\(\s*(.+)\s*\)$/);
    return match ? match[1] : null;
  }

  private extractBraceContent(segment: string): string | null {
    const match = segment.match(/^\{\s*(.+)\s*\}\s*$/);
    return match ? match[1] : null;
  }

  private checkProcessSubstitution(segment: string): CheckResult {
    const regex = />\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(segment)) !== null) {
      const result = this.check(match[1]);
      if (!result.allowed) return result;
    }
    return { allowed: true };
  }

  private validateEvalArgs(cmd: string): CheckResult | null {
    const rest = cmd.substring(4).trimStart();
    let inner = '';
    if (rest.startsWith("'") || rest.startsWith('"')) {
      const quote = rest[0];
      const endIdx = rest.indexOf(quote, 1);
      if (endIdx > 1) inner = rest.slice(1, endIdx);
    } else {
      inner = rest;
    }
    if (inner.trim()) {
      const result = this.check(inner);
      if (!result.allowed) return result;
    }
    return null;
  }

  private validateExecArgs(cmd: string): CheckResult | null {
    const rest = cmd.substring(4).trimStart();
    if (!rest) return null;
    const target = resolverGetFirstToken(rest);
    if (SHELL_PATTERNS.includes(target as any)) return { allowed: false, reason: 'Shell replacement detected', blockedCommand: target };
    if (/^\/bin\//.test(target) || /^\/usr\/bin\//.test(target)) return { allowed: false, reason: 'Shell path detected', blockedCommand: target };
    return null;
  }
}

// Singleton instance — her yerde aynı referans
export const checker = new CommandChecker();
