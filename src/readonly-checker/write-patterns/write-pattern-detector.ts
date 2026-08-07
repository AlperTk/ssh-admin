import {
  REDIR_APPEND_RE, REDIR_COMBINED_RE, REDIR_STDOUT_RE, REDIR_STDERR_RE,
  TEE_PIPE_RE, WRITE_PROC_SUB_RE, XARGS_RE, HERE_STRING_RE,
  SED_INPLACE_RE, SED_INPLACE_LONG_RE, SED_WRITE_RE,
  FIND_EXEC_RE, CP_STDIN_RE, CP_DASH_RE, DD_OF_RE,
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
  detect(segment: string): { ok: boolean; debug?: { rule: string; text: string } } {
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

    // 2. Pipe ile tee kullanımı
    if (TEE_PIPE_RE.test(unquoted)) return { ok: true, debug: { rule: 'TEE_PIPE_RE', text: '| tee' } };

    // 3. Write process substitution
    if (WRITE_PROC_SUB_RE.test(unquoted)) return { ok: true, debug: { rule: 'WRITE_PROC_SUB_RE', text: '>()' } };

    // 4. xargs — read-only komutlarla kullanılanları izin ver
    if (XARGS_RE.test(unquoted)) {
      const XARGS_READ_ONLY_CMDS = new Set([
        "cat", "less", "more", "head", "tail", "grep", "fgrep", "egrep",
        "wc", "file", "md5sum", "sha256sum", "sha1sum", "stat", "du",
        "sort", "uniq", "awk", "nmcli", "journalctl", "ps", "pgrep",
        "pkill", "lsof", "strace", "tcpdump", "tshark", "hexdump",
        "xxd", "od", "diff", "rpm", "dpkg", "apt", "yum",
        "pip", "npm", "docker", "nc", "socat", "nmap", "masscan",
        "ping", "traceroute", "mtr", "dig", "nslookup",
        "host", "whois", "ssh", "arp", "ip", "ethtool", "mii-tool",
        "iwconfig", "ifconfig", "netstat", "ss", "route", "iptables",
        "ip6tables", "nft", "firewall-cmd", "ufw", "sestatus",
        "getenforce", "auditctl", "ausearch", "aureport",
        "fail2ban-client", "logwatch", "logrotate", "dmesg",
        "vmstat", "mpstat", "iostat", "sar", "hdparm", "smartctl",
        "lsblk", "lscpu", "lsmem", "lstopo", "numactl", "lshw",
        "lspci", "lsusb", "dmidecode", "inxi", "neofetch", "fastfetch",
        "uptime", "w", "who", "last", "lastlog", "lastb",
      ]);
      // xargs'tan sonraki ilk kelimeyi al (pipeline içindeki doğru konum)
      const xargsMatch = unquoted.match(/\bxargs\b\s+(\S+)/);
      if (xargsMatch) {
        const cmdAfterXargs = xargsMatch[1];
        // curl/wget/xargs sonrası handler dispatch'e bırak (flag-level kontrol handler'da yapılacak)
        if (cmdAfterXargs === 'curl' || cmdAfterXargs === 'wget') return { ok: false };
        if (XARGS_READ_ONLY_CMDS.has(cmdAfterXargs)) return { ok: false };
      }
      return { ok: true, debug: { rule: 'XARGS_RE', text: 'xargs' } };
    }

    // 5. Here-string / here-doc
    if (HERE_STRING_RE.test(segment)) return { ok: true, debug: { rule: 'HERE_STRING_RE', text: '<<<' } };

    // 6. sed write komutları
    if (/\bsed\b/.test(unquoted)) {
      if (SED_INPLACE_RE.test(unquoted)) return { ok: true, debug: { rule: 'SED_INPLACE_RE', text: 'sed -i' } };
      if (SED_INPLACE_LONG_RE.test(unquoted)) return { ok: true, debug: { rule: 'SED_INPLACE_LONG_RE', text: 'sed --in-place' } };
      if (SED_WRITE_RE.test(unquoted)) return { ok: true, debug: { rule: 'SED_WRITE_RE', text: 'sed -n w' } };
    }

    // 7. find -exec / -execdir
    if (FIND_EXEC_RE.test(unquoted)) return { ok: true, debug: { rule: 'FIND_EXEC_RE', text: '-exec' } };

    // 8. cp with stdin/dev/stdin
    if (/\bcp\b/.test(unquoted)) {
      if (CP_STDIN_RE.test(unquoted)) return { ok: true, debug: { rule: 'CP_STDIN_RE', text: '/dev/stdin' } };
      if (CP_DASH_RE.test(unquoted)) return { ok: true, debug: { rule: 'CP_DASH_RE', text: 'cp -' } };
    }

    // 9. dd with output file
    if (/\bdd\b/.test(unquoted) && DD_OF_RE.test(unquoted)) return { ok: true, debug: { rule: 'DD_OF_RE', text: 'dd of=' } };

    // 11. Interpreter writes
    const interpResult = this.detectInterpreterWrites(unquoted);
    if (interpResult.ok) return interpResult;

    // 12. Reverse shell
    const reverseShellResult = this.detectReverseShell(unquoted);
    if (reverseShellResult.ok) return reverseShellResult;

    return { ok: false };
  }

  private detectInterpreterWrites(s: string): { ok: boolean; debug?: { rule: string; text: string } } {
    if (!INTERPRETER_RE.test(s)) return { ok: false };
    if (PYTHON_OPEN_RE.test(s)) return { ok: true, debug: { rule: 'PYTHON_OPEN_RE', text: 'open()' } };
    if (PYTHON_OS_RE.test(s)) return { ok: true, debug: { rule: 'PYTHON_OS_RE', text: 'os.system/popen' } };
    if (PYTHON_SUBPROCESS_RE.test(s)) return { ok: true, debug: { rule: 'PYTHON_SUBPROCESS_RE', text: 'subprocess.' } };
    if (RUBY_FILE_WRITE_RE.test(s)) return { ok: true, debug: { rule: 'RUBY_FILE_WRITE_RE', text: 'File.write' } };
    if (RUBY_IO_WRITE_RE.test(s)) return { ok: true, debug: { rule: 'RUBY_IO_WRITE_RE', text: 'IO.write' } };
    if (NODE_FS_WRITE_RE.test(s)) return { ok: true, debug: { rule: 'NODE_FS_WRITE_RE', text: 'fs.write' } };
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
