import {
  REDIR_APPEND_RE, REDIR_COMBINED_RE, REDIR_STDOUT_RE, REDIR_STDERR_RE,
  WRITE_PROC_SUB_RE, HERE_STRING_RE,
  SED_INPLACE_RE, SED_INPLACE_LONG_RE, SED_WRITE_RE,
  FIND_EXEC_RE,
  REVERSE_SHELL_NET_RE, REVERSE_SHELL_NC_RE, REVERSE_SHELL_SOCAT_RE, REVERSE_SHELL_TCP_RE,
} from '../../data/readonly-rules.js';

/** Çift tırnak içindeki içerikleri çıkarır (false positive önleme) */
function stripDoubleQuotes(cmd: string): string {
  let result = '';
  let inDQ = false;
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (ch === '"' && !inDQ) inDQ = true;
    else if (ch === '"' && inDQ) inDQ = false;
    else if (!inDQ) result += ch;
  }
  return result;
}

/** Redirect hedefi /dev/null ise güvenli (veri kaybı yok) */
function isDevNullRedirect(segment: string): boolean {
  return /\/dev\/null\s*$/.test(segment.trim());
}

export class WritePatternDetector {
  detect(segment: string): { ok: boolean; debug?: { rule: string; text: string } } {
    // /dev/null redirect'leri güvenli — gerçek dosya yazma yok
    if (isDevNullRedirect(segment)) return { ok: false };

    const unquoted = stripDoubleQuotes(segment);

    // 1. Temel redirection pattern'ları
    if (REDIR_APPEND_RE.test(unquoted)) return { ok: true, debug: { rule: 'REDIR_APPEND_RE', text: '>>' } };
    if (REDIR_COMBINED_RE.test(unquoted)) return { ok: true, debug: { rule: 'REDIR_COMBINED_RE', text: '&>' } };
    if (REDIR_STDOUT_RE.test(unquoted)) {
      const m = unquoted.match(REDIR_STDOUT_RE);
      return { ok: true, debug: { rule: 'REDIR_STDOUT_RE', text: m ? m[0] : '>' } };
    }
    if (REDIR_STDERR_RE.test(unquoted)) {
      const m = unquoted.match(REDIR_STDERR_RE);
      return { ok: true, debug: { rule: 'REDIR_STDERR_RE', text: m ? m[0] : '2>' } };
    }

    // 2. Write process substitution
    if (WRITE_PROC_SUB_RE.test(unquoted)) return { ok: true, debug: { rule: 'WRITE_PROC_SUB_RE', text: '>()' } };

    // 3. Here-string / here-doc
    if (HERE_STRING_RE.test(segment)) return { ok: true, debug: { rule: 'HERE_STRING_RE', text: '<<<' } };

    // 4. sed write komutları
    if (/\bsed\b/.test(unquoted)) {
      if (SED_INPLACE_RE.test(unquoted)) return { ok: true, debug: { rule: 'SED_INPLACE_RE', text: 'sed -i' } };
      if (SED_INPLACE_LONG_RE.test(unquoted)) return { ok: true, debug: { rule: 'SED_INPLACE_LONG_RE', text: 'sed --in-place' } };
      if (SED_WRITE_RE.test(unquoted)) return { ok: true, debug: { rule: 'SED_WRITE_RE', text: 'sed -n w' } };
    }

    // 5. find -exec / -execdir
    if (FIND_EXEC_RE.test(unquoted)) return { ok: true, debug: { rule: 'FIND_EXEC_RE', text: '-exec' } };

    // 6. Reverse shell
    const reverseShellResult = this.detectReverseShell(unquoted);
    if (reverseShellResult.ok) return reverseShellResult;

    return { ok: false };
  }

  private detectReverseShell(s: string): { ok: boolean; debug?: { rule: string; text: string } } {
    if (!REVERSE_SHELL_NET_RE.test(s)) return { ok: false };
    if (REVERSE_SHELL_NC_RE.test(s)) return { ok: true, debug: { rule: 'REVERSE_SHELL_NC_RE', text: 'nc -e' } };
    if (REVERSE_SHELL_SOCAT_RE.test(s)) return { ok: true, debug: { rule: 'REVERSE_SHELL_SOCAT_RE', text: 'socat exec:' } };
    if (REVERSE_SHELL_TCP_RE.test(s)) return { ok: true, debug: { rule: 'REVERSE_SHELL_TCP_RE', text: 'tcp:port' } };
    return { ok: false };
  }
}
