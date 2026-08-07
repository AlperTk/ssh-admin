import { readFileSync } from 'fs';
import { join } from 'path';

class CommandChecker {
  private allowedCommands: Set<string>;

  constructor() {
    const whitelist = JSON.parse(
      readFileSync(join(__dirname, 'data', 'readonly-whitelist.json'), 'utf-8')
    );
    this.allowedCommands = new Set(whitelist.commands);
  }

  check(command: string): { allowed: boolean; reason?: string } {
    if (!command.trim()) {
      return { allowed: true };
    }

    console.error(`[READONLY-CHECKER] Checking command: ${command}`);
    const segments = this.parseSegments(command);
    console.error(`[READONLY-CHECKER] Parsed segments: ${JSON.stringify(segments)}`);
    
    for (const segment of segments) {
      const result = this.checkSegment(segment.trim());
      console.error(`[READONLY-CHECKER] Segment "${segment.trim()}": allowed=${result.allowed}${result.reason ? `, reason=${result.reason}` : ''}`);
      if (!result.allowed) {
        return result;
      }
    }

    console.error(`[READONLY-CHECKER] Command ALLOWED`);
    return { allowed: true };
  }

  private parseSegments(cmd: string): string[] {
    const segments: string[] = [];
    let current = '';
    let depth = 0;
    let braceDepth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < cmd.length; i++) {
      const char = cmd[i];

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        current += char;
      } else if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        current += char;
      } else if (!inSingleQuote && !inDoubleQuote) {
        if (char === '(') {
          depth++;
          current += char;
        } else if (char === ')') {
          depth--;
          current += char;
        } else if (char === '{' && depth === 0) {
          braceDepth++;
          current += char;
        } else if (char === '}' && braceDepth > 0) {
          braceDepth--;
          current += char;
        } else if (depth === 0 && braceDepth === 0 && (cmd.startsWith('&&', i) || cmd.startsWith('||', i))) {
          if (current.trim()) {
            segments.push(current.trim());
          }
          current = '';
          i += 1;
        } else if (depth === 0 && braceDepth === 0 && char === ';') {
          if (current.trim()) {
            segments.push(current.trim());
          }
          current = '';
        } else {
          current += char;
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      segments.push(current.trim());
    }

    return segments;
  }

  private checkSegment(segment: string): { allowed: boolean; reason?: string } {
    const subshellContent = this.extractSubshellContent(segment);
    if (subshellContent !== null) {
      return this.check(subshellContent);
    }

    const braceContent = this.extractBraceContent(segment);
    if (braceContent !== null) {
      return this.check(braceContent);
    }

    const pipeSegments = this.parsePipeSegments(segment);
    for (const pipeSeg of pipeSegments) {
      const trimmed = pipeSeg.trim();
      if (!trimmed) continue;

      const processSubResult = this.checkProcessSubstitution(trimmed);
      if (!processSubResult.allowed) {
        return processSubResult;
      }

      const firstToken = this.getActualCommand(trimmed);
      if (!this.allowedCommands.has(firstToken)) {
        return { allowed: false, reason: `Command '${firstToken}' is not in the read-only whitelist` };
      }

      if (this.hasWriteArg(trimmed, firstToken)) {
        return { allowed: false, reason: `Write argument detected in command` };
      }

      if (this.hasWritePattern(pipeSeg)) {
        return { allowed: false, reason: `Write pattern detected in command` };
      }
    }

    return { allowed: true };
  }

  private parsePipeSegments(segment: string): string[] {
    const segments: string[] = [];
    let current = '';
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < segment.length; i++) {
      const char = segment[i];

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        current += char;
      } else if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        current += char;
      } else if (!inSingleQuote && !inDoubleQuote) {
        if (char === '(') {
          depth++;
          current += char;
        } else if (char === ')') {
          depth--;
          current += char;
        } else if (depth === 0 && char === '|') {
          if (i + 1 < segment.length && segment[i + 1] === '|') {
            current += char;
          } else {
            if (current.trim()) {
              segments.push(current.trim());
            }
            current = '';
          }
        } else {
          current += char;
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      segments.push(current.trim());
    }

    return segments;
  }

  private extractSubshellContent(segment: string): string | null {
    const match = segment.match(/^\(\s*(.+)\s*\)$/);
    if (match) {
      return match[1];
    }
    return null;
  }

  private extractBraceContent(segment: string): string | null {
    const match = segment.match(/^\{\s*(.+)\s*\}\s*$/);
    if (match) {
      return match[1];
    }
    return null;
  }

  private checkProcessSubstitution(segment: string): { allowed: boolean; reason?: string } {
    const processSubRegex = />\(([^)]+)\)/g;
    let match;
    while ((match = processSubRegex.exec(segment)) !== null) {
      const content = match[1];
      const result = this.check(content);
      if (!result.allowed) {
        return result;
      }
    }
    return { allowed: true };
  }

  private getFirstToken(cmd: string): string {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let token = '';

    for (let i = 0; i < cmd.length; i++) {
      const char = cmd[i];

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      } else if (!inSingleQuote && !inDoubleQuote) {
        if (char === ' ' || char === '\t' || char === ';') {
          break;
        }
        token += char;
      } else {
        token += char;
      }
    }

    return token;
  }

  private getActualCommand(cmd: string): string {
    const firstToken = this.getFirstToken(cmd);
    
    if (firstToken === 'sudo') {
      let rest = cmd.substring(firstToken.length).trimStart();
      // Skip sudo flags like -n, -S, -p, etc.
      while (rest.startsWith('-') && !rest.match(/^[a-zA-Z]/)) {
        const flagEnd = rest.search(/\s+/);
        if (flagEnd === -1) break;
        const afterFlag = rest.substring(flagEnd).trimStart();
        if (afterFlag.startsWith('-')) {
          const nextFlagEnd = afterFlag.search(/\s+/);
          if (nextFlagEnd === -1) break;
          rest = afterFlag.substring(nextFlagEnd).trimStart();
        } else {
          rest = afterFlag;
          break;
        }
      }
      return this.getActualCommand(rest);
    }
    
    if (firstToken === 'su') {
      const rest = cmd.substring(firstToken.length).trimStart();
      const cMatch = rest.match(/-c\s+['"]?(.+?)['"]?$/);
      if (cMatch) {
        return this.getActualCommand(cMatch[1]);
      }
      const restToken = this.getFirstToken(rest);
      if (restToken) {
        return this.getActualCommand(rest);
      }
    }
    
    if (firstToken === 'ssh') {
      const rest = cmd.substring(firstToken.length).trimStart();
      const hostPattern = /[^'"\s]+@[^'"\s]+/;
      const match = rest.match(hostPattern);
      if (match) {
        const afterHost = rest.substring(match[0].length).trimStart();
        if (afterHost) {
          return this.getActualCommand(afterHost);
        }
      }
    }
    
    return firstToken;
  }

  private hasWriteArg(cmd: string, firstToken: string): boolean {
    if ((firstToken === 'curl' || firstToken === 'wget') && (/\s-[oO]\s/.test(cmd) || /\s-[oO]$/.test(cmd))) {
      return true;
    }
    
    if (firstToken === 'git') {
      const writeCommands = ['commit', 'push', 'merge', 'rebase', 'reset', 'clean', 'am', 'apply', 'bisect', 'cherry-pick', 'force-push', 'push'];
      const rest = cmd.substring(firstToken.length).trimStart();
      const secondToken = this.getFirstToken(rest);
      if (writeCommands.includes(secondToken)) {
        return true;
      }
    }
    
    // systemctl whitelist: sadece read-only subkomutlar izinli
    if (firstToken === 'systemctl') {
      // firstToken'ın komuttaki konumunu bul (sudo/systemctl prefix olabilir)
      const idx = cmd.toLowerCase().indexOf('systemctl');
      if (idx !== -1) {
        let rest = cmd.substring(idx + firstToken.length).trimStart();
        // Tüm flag'leri atla (herhangi - ile başlayan token)
        while (rest.startsWith('-')) {
          const spaceIdx = rest.indexOf(' ');
          if (spaceIdx === -1) {
            rest = '';
            break;
          }
          rest = rest.substring(spaceIdx).trimStart();
        }
        const subCmd = this.getFirstToken(rest);
        // Subcommand yoksa (sadece "systemctl") → izinli
        if (!subCmd) {
          return false;
        }
        const allowedSubCommands = [
          'status', 'is-active', 'is-enabled', 'is-failed', 'list-units',
          'list-sockets', 'list-timers', 'list-dependencies', 'cat', 'show',
          'get-default', 'help', 'dump', 'import-environment', 'tmpfiles',
          'property', 'daemon-status', 'log', 'is-system-running',
        ];
        if (!allowedSubCommands.includes(subCmd)) {
          return true;
        }
      }
    }
    
    return false;
  }

  private hasWritePattern(segment: string): boolean {
    const patterns = [
      /(?<![-])>[^>]/,
      />>/,
      /2>/,
      /&>/,
      /\|.*tee\b/,
      />\(/,
      /\becho\b.*>/,
      /\bcat\b.*>/,
      /\bawk\b.*>/,
      /\bsed\b.*-i[a-z]*\b/,
      /\btr\b.*>/,
      /\bsort\b.*>/,
      /\buniq\b.*>/,
      /\bgrep\b.*>/,
      /\bfind\b.*-exec\b/,
      /\bxargs\b/,
    ];

    for (const pattern of patterns) {
      if (pattern.test(segment)) {
        return true;
      }
    }

    // Here-string / here-doc redirection
    if (/<<</.test(segment)) {
      return true;
    }

    // sed write command: sed ... "w /path" veya sed ... -w /path
    if (/\bsed\b/.test(segment) && /["']w\s+\/[^"']/.test(segment)) {
      return true;
    }

    // cp with stdin/dev/stdin
    if (/\bcp\b/.test(segment) && (/\/dev\/stdin/.test(segment) || /-\s*$/.test(segment))) {
      return true;
    }

    // dd with output file
    if (/\bdd\b/.test(segment) && /\bof\s*=\s*\//.test(segment)) {
      return true;
    }

    // tar create mode
    if (/\btar\b/.test(segment) && /\bc[a-zA-Z]*f/.test(segment)) {
      return true;
    }



    // python/perl/ruby/node one-liner file writes
    if (/\b(python3?|perl|ruby|node)\b/.test(segment) && /\bopen\s*\(/.test(segment)) {
      return true;
    }

    // awk print to file: awk '... > "file"'
    if (/\bawk\b/.test(segment) && />\s*["'][^"']+["']/.test(segment)) {
      return true;
    }

    return false;
  }
}

export { CommandChecker };
