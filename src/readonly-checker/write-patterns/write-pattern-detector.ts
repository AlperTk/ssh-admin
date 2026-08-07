import {
  REDIR_APPEND_RE, REDIR_COMBINED_RE, REDIR_STDOUT_RE, REDIR_STDERR_RE,
  TEE_PIPE_RE, WRITE_PROC_SUB_RE, XARGS_RE, HERE_STRING_RE,
  SED_INPLACE_RE, SED_INPLACE_LONG_RE, SED_WRITE_RE,
  FIND_EXEC_RE, CP_STDIN_RE, CP_DASH_RE, DD_OF_RE,
  TAR_CREATE_SHORT_RE, TAR_CREATE_LONG_RE, TAR_CF_RE,
  INTERPRETER_RE, PYTHON_OPEN_RE, PYTHON_OS_RE, PYTHON_SUBPROCESS_RE,
  RUBY_FILE_WRITE_RE, RUBY_IO_WRITE_RE, NODE_FS_WRITE_RE,
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

export class WritePatternDetector {
  detect(segment: string): boolean {
    const unquoted = stripDoubleQuotes(segment);

    // 1. Temel redirection pattern'ları
    if (REDIR_APPEND_RE.test(unquoted)) return true;
    if (REDIR_COMBINED_RE.test(unquoted)) return true;
    if (REDIR_STDOUT_RE.test(unquoted)) return true;
    if (REDIR_STDERR_RE.test(unquoted)) return true;

    // 2. Pipe ile tee kullanımı
    if (TEE_PIPE_RE.test(unquoted)) return true;

    // 3. Write process substitution
    if (WRITE_PROC_SUB_RE.test(unquoted)) return true;

    // 4. xargs — her zaman engelle
    if (XARGS_RE.test(unquoted)) return true;

    // 5. Here-string / here-doc
    if (HERE_STRING_RE.test(segment)) return true;

    // 6. sed write komutları
    if (/\bsed\b/.test(unquoted)) {
      if (SED_INPLACE_RE.test(unquoted)) return true;
      if (SED_INPLACE_LONG_RE.test(unquoted)) return true;
      if (SED_WRITE_RE.test(unquoted)) return true;
    }

    // 7. find -exec / -execdir
    if (FIND_EXEC_RE.test(unquoted)) return true;

    // 8. cp with stdin/dev/stdin
    if (/\bcp\b/.test(unquoted)) {
      if (CP_STDIN_RE.test(unquoted)) return true;
      if (CP_DASH_RE.test(unquoted)) return true;
    }

    // 9. dd with output file
    if (/\bdd\b/.test(unquoted) && DD_OF_RE.test(unquoted)) return true;

    // 10. tar create mode
    if (/\btar\b/.test(unquoted)) {
      if (TAR_CREATE_SHORT_RE.test(unquoted)) return true;
      if (TAR_CREATE_LONG_RE.test(unquoted)) return true;
      if (TAR_CF_RE.test(unquoted)) return true;
    }

    // 11. Interpreter writes
    if (this.detectInterpreterWrites(unquoted)) return true;

    // 12. Reverse shell
    if (this.detectReverseShell(unquoted)) return true;

    return false;
  }

  private detectInterpreterWrites(s: string): boolean {
    if (!INTERPRETER_RE.test(s)) return false;
    return (
      PYTHON_OPEN_RE.test(s) ||
      PYTHON_OS_RE.test(s) ||
      PYTHON_SUBPROCESS_RE.test(s) ||
      RUBY_FILE_WRITE_RE.test(s) ||
      RUBY_IO_WRITE_RE.test(s) ||
      NODE_FS_WRITE_RE.test(s)
    );
  }

  private detectReverseShell(s: string): boolean {
    if (!REVERSE_SHELL_NET_RE.test(s)) return false;
    return (
      REVERSE_SHELL_NC_RE.test(s) ||
      REVERSE_SHELL_SOCAT_RE.test(s) ||
      REVERSE_SHELL_TCP_RE.test(s)
    );
  }
}
