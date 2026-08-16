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

import { fail2banHasWriteArg } from './write-handlers/fail2ban-handler.js';
import { journalctlHasWriteArg } from './write-handlers/journalctl-handler.js';
import { awkHasWriteArg } from './write-handlers/awk-handler.js';
import { scpHasWriteArg } from './write-handlers/scp-handler.js';
import { tarHasWriteArg } from './write-handlers/tar-handler.js';
import { partxHasWriteArg } from './write-handlers/partx-handler.js';
import { kpartxHasWriteArg } from './write-handlers/kpartx-handler.js';
import { dmsetupHasWriteArg } from './write-handlers/dmsetup-handler.js';
import { snapHasWriteArg } from './write-handlers/snap-handler.js';
import { tune2fsHasWriteArg } from './write-handlers/tune2fs-handler.js';
import { ufwHasWriteArg } from './write-handlers/ufw-handler.js';
import { iptablesHasWriteArg } from './write-handlers/iptables-handler.js';
import { scriptreplayHasWriteArg } from './write-handlers/scriptreplay-handler.js';
import { partprobeHasWriteArg } from './write-handlers/partprobe-handler.js';
import { sysctlHasWriteArg } from './write-handlers/sysctl-handler.js';
import { arHasWriteArg } from './write-handlers/ar-handler.js';
import { stripHasWriteArg } from './write-handlers/strip-handler.js';
import { objcopyHasWriteArg } from './write-handlers/objcopy-handler.js';
import { hostnameHasWriteArg } from './write-handlers/hostname-handler.js';
import { trapHasWriteArg } from './write-handlers/trap-handler.js';
import { aliasHasWriteArg } from './write-handlers/alias-handler.js';
import { WritePatternDetector } from './write-patterns/write-pattern-detector.js';
import { resolveCommand, getFirstToken as resolverGetFirstToken } from './resolution/command-resolver.js';
import { extractLoopBody } from './parsing/loop-extractor.js';
import { checkSubstitutions } from './parsing/substitution-detector.js';

export interface CheckResult {
  allowed: boolean;
  reason?: string;
  blockedCommand?: string;
  matchedRule?: string;
  matchedText?: string;
  segmentIndex?: number;
  checkLayer?: 'substitution' | 'loop' | 'whitelist' | 'handler' | 'pattern';
  resolvedCommand?: string;
  originalCommand?: string;
  handlerName?: string;
  pipeSegments?: string[];
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
  private readonly denyCommands = new Set(['.']);
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
      ['fail2ban-client', fail2banHasWriteArg],
      ['journalctl', journalctlHasWriteArg],
      ['awk', awkHasWriteArg],
      ['scp', scpHasWriteArg],
      ['tar', tarHasWriteArg],
      ['partx', partxHasWriteArg],
      ['kpartx', kpartxHasWriteArg],
      ['dmsetup', dmsetupHasWriteArg],
      ['snap', snapHasWriteArg],
      ['tune2fs', tune2fsHasWriteArg],
      ['ufw', ufwHasWriteArg],
      ['iptables', iptablesHasWriteArg],
      ['scriptreplay', scriptreplayHasWriteArg],
      ['partprobe', partprobeHasWriteArg],
      ['sysctl', sysctlHasWriteArg],
      ['ar', arHasWriteArg],
      ['strip', stripHasWriteArg],
      ['objcopy', objcopyHasWriteArg],
      ['hostname', hostnameHasWriteArg],
      ['trap', trapHasWriteArg],
      ['alias', aliasHasWriteArg],
    ]);

    this.patternDetector = new WritePatternDetector();
  }

  check(command: string): CheckResult {
    if (!command.trim()) return { allowed: true };

    // 1. Substitution detection → recursive check
    const subResult = checkSubstitutions(command, (inner) => this.check(inner));
    if (subResult && !subResult.allowed) {
      return { ...subResult, checkLayer: 'substitution' as const, originalCommand: command };
    }

    // 2. Loop extraction → recursive check
    const loopBody = extractLoopBody(command);
    if (loopBody !== null) {
      const loopResult = this.check(loopBody);
      return { ...loopResult, checkLayer: 'loop' as const, originalCommand: command };
    }

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

        // 3c. DENY CHECK — execution builtins (dot-source vb.) read-only'da asla geçemez
        if (this.denyCommands.has(cmd)) {
          return { allowed: false, reason: `Command '${cmd}' is not permitted in read-only mode`, blockedCommand: cmd, segmentIndex: segIdx, checkLayer: 'whitelist' as const, resolvedCommand: resolved, pipeSegments: pipeSegments.map(s => s.trim()) };
        }

        // 3d. WHITELIST CHECK — O(1), early exit
        if (!this.whitelist.has(cmd)) {
          return { allowed: false, reason: `Command '${cmd}' is not in the read-only whitelist`, blockedCommand: cmd, segmentIndex: segIdx, checkLayer: 'whitelist' as const, resolvedCommand: resolved, pipeSegments: pipeSegments.map(s => s.trim()) };
        }

        // 3e. DIRECT DISPATCH — O(1), no iteration
        const handler = this.handlers.get(cmd);
        if (handler && handler(pTrimmed)) {
          return { allowed: false, reason: `Write argument detected in command`, blockedCommand: cmd, matchedRule: `${cmd} write arg`, segmentIndex: segIdx, checkLayer: 'handler' as const, resolvedCommand: resolved, handlerName: cmd, pipeSegments: pipeSegments.map(s => s.trim()) };
        }

        // 3f. Write pattern detection
        const patternResult = this.patternDetector.detect(pTrimmed);
        if (patternResult.ok) {
          return { allowed: false, reason: `Write pattern detected in command`, blockedCommand: cmd, matchedRule: patternResult.debug?.rule, matchedText: patternResult.debug?.text, segmentIndex: segIdx, checkLayer: 'pattern' as const, resolvedCommand: resolved, handlerName: cmd, pipeSegments: pipeSegments.map(s => s.trim()) };
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

}

// Singleton instance — her yerde aynı referans
export const checker = new CommandChecker();
