// Git: sadece bu alt komutlar okuma olarak kabul edilir
export const GIT_READ_ONLY = [
  'log', 'show', 'diff', 'status', 'tag', 'describe',
  'blame', 'shortlog', 'for-each-ref', 'ls-files',
  'ls-tree', 'rev-list', 'rev-parse', 'name-rev',
  'cat-file', 'verify-tag', 'verify-commit',
  'diff-tree', 'diff-files', 'pack-refs',
  'count-objects', 'var', 'config', 'version',
  'remote', 'worktree', 'stash', 'mailinfo', 'mailsplit',
  'interpret-trailers', 'fmt-merge-msg', 'merge-tree',
  'mktree', 'write-tree', 'read-tree', 'update-index',
  'update-ref', 'symbolic-ref', 'get-toplevel', 'is-inside-work-tree',
  'is-inside-git-dir', 'sort-object',
  'branch', 'reflog',
] as const;

export const GIT_STASH_READ_ONLY = ['list', 'show', 'push'] as const;

// journalctl: sadece bu flag'ler okuma olarak kabul edilir
export const JOURNALCTL_SAFE_FLAGS = new Set([
  '--no-pager', '--no-full', '--lines', '--output',
  '--quiet', '--all', '--utc', '--reverse',
  '--since', '--until', '--cursor', '--identifier',
  '--unit', '--priority', '--grep', '--field',
  '--catalog', '--disk-use', '--list-boots',
  '--machine', '--root', '--user', '--system',
  '--boot', '--current', '--dmesg', '--effect',
  '--follow', '--force',
  '--help', '--interval', '--journal-dir',
  '--local-timezone', '--match', '--namespace',
  '--show-cursor', '--tail', '--transient-key',
  '--uid', '--version',
  '-f', '-n', '-o', '-q', '-a', '-u', '-p',
  '-g', '-F', '-b', '-k', '-e', '-m', '-x',
  '-i', '--no-pager', '--no-full',
  '--disk', '--verify',
]);

// systemctl: sadece read-only alt komutlar izinli
export const SYSTEMCTL_READ_ONLY = new Set([
  'status', 'is-active', 'is-enabled', 'is-failed', 'list-units',
  'list-sockets', 'list-timers', 'list-dependencies', 'cat', 'show',
  'get-default', 'help', 'dump', 'import-environment', 'tmpfiles',
  'property', 'daemon-status', 'log', 'is-system-running',
]);

// ip: network interface inspection — read-only alt komutlar
export const IP_READ_ONLY = new Set([
  'addr', 'link', 'route', 'neigh', 'rule', 'tunnel', 'xfrm',
  'maddr', 'monitor', 'check', 'session',
]);

// ip: read-only subcommand mapping (whitelist)
export const IP_READ_ONLY_SUBCOMMANDS = new Map<string, string[]>([
  ['addr', ['show', 'list']],
  ['link', ['show', 'list']],
  ['route', ['show', 'list']],
  ['neigh', ['show', 'list']],
  ['rule', ['show', 'list']],
  ['tunnel', ['show', 'list']],
  ['maddr', ['show', 'list']],
]);

// apt: sadece read-only alt komutlar izinli
export const APT_READ_ONLY = new Set([
  'list', 'show', 'search', 'policy', 'info', 'cache', 'depends',
  'rdepends', 'madison', 'edit-sources',
  'update', 'check', 'simulator', 'autoremove',
]);



// docker: sadece read-only alt komutlar izinli
export const DOCKER_READ_ONLY = new Set([
  'ps', 'images', 'inspect', 'logs', 'top', 'stats', 'version', 'info',
  'diff', 'port', 'events', 'task',
  'container', 'image', 'system',
  'config', 'node', 'service', 'volume', 'network', 'plugin', 'secret', 'swarm',
]);



export const DOCKER_NAMESPACE_WRITE = new Map<string, string[]>([
  ['system', ['prune']],
  ['image', ['rm', 'push', 'save', 'load', 'history', 'tag']],
  ['container', ['rm', 'start', 'stop', 'restart', 'kill', 'exec', 'update', 'rename', 'cp', 'attach', 'wait', 'pause', 'unpause', 'resize']],
  ['volume', ['rm', 'create']],
  ['network', ['rm', 'connect', 'disconnect']],
  ['plugin', ['install', 'remove', 'disable', 'enable']],
  ['secret', ['rm', 'create', 'update']],
  ['config', ['rm', 'create', 'update']],
  ['node', ['demote', 'promote', 'update', 'rm']],
  ['service', ['rm', 'create', 'update', 'scale', 'rollback']],
  ['swarm', ['leave', 'unlock', 'lock', 'init', 'join', 'ca']],
]);

// crontab flags
export const CRONTAB_WRITE_FLAGS = ['-e'] as const;

// shell replacement patterns
export const SHELL_PATTERNS = ['bash', 'sh', 'zsh', 'csh', 'ksh', 'dash', 'fish'] as const;

// Compiled regex for write pattern detection (pre-compiled for performance)
export const REDIR_APPEND_RE = />>/;
export const REDIR_COMBINED_RE = /&>/;
export const REDIR_STDOUT_RE = /(?<![-])>(?!>|=)(?!(\/dev\/(null|zero)))(?!&\d)/;
export const REDIR_STDERR_RE = /2>(?!=)(?!\/dev\/(null|zero))(?!&\d)/;
export const TEE_PIPE_RE = /\|.*tee\b/;
export const WRITE_PROC_SUB_RE = />\(/;
export const XARGS_RE = /\bxargs\b/;
export const HERE_STRING_RE = /<<<\s/;
export const SED_INPLACE_RE = /\bsed\b.*-i[a-z]*\b/;
export const SED_INPLACE_LONG_RE = /\bsed\b.*--in-place/;
export const SED_WRITE_RE = /\bsed\b.*["']w\s+\/[^"']/;
export const FIND_EXEC_RE = /\bfind\b.*(-exec|-execdir)\b/;
export const CP_STDIN_RE = /\/dev\/stdin/;
export const CP_DASH_RE = /-\s*$/;
export const DD_OF_RE = /\bof\s*=\s*[^s]/;

export const INTERPRETER_RE = /\b(python3?|perl|ruby|node)\b/;
export const PYTHON_OPEN_RE = /\bopen\s*\(/;
export const PYTHON_OS_RE = /\bos\.(system|popen|write)\s*\(/;
export const PYTHON_SUBPROCESS_RE = /\bsubprocess\./;
export const RUBY_FILE_WRITE_RE = /\bFile\.write\s*\(/;
export const RUBY_IO_WRITE_RE = /\bIO\.write\s*\(/;
export const NODE_FS_WRITE_RE = /\bfs\.(writeFileSync|createWriteStream|write)\s*\(/;
export const REVERSE_SHELL_NET_RE = /\b(nc|ncat|netcat|socat)\b/;
export const REVERSE_SHELL_NC_RE = /-e\s+\/bin\/(sh|bash|zsh)/;
export const REVERSE_SHELL_SOCAT_RE = /\bexec\s*:\s*\/bin\//;
export const REVERSE_SHELL_TCP_RE = /tcp:.*:\d+/;

// awk: safe pattern'lar (whitelist — sadece bunlar izinli)
export const AWK_SAFE_PATTERNS = [
  /print\s+[\$]?/,
  /print\s+[^>]/,
  /printf\s+["'].*["']\s*,?\s*/,
  /\bBEGIN\b/,
  /\bEND\b/,
  /\bif\s*\(/,
  /\bfor\s*\(/,
  /\bwhile\s*\(/,
  /\bnext\b/,
  /\bexit\b/,
  /\bdelete\s+\w+/,
  /\blength\s*\(/,
  /\bsplit\s*\(/,
  /\bsubstr\s*\(/,
  /\bsub\s*\(/,
  /\bgsub\s*\(/,
  /\bindex\s*\(/,
  /\bmatch\s*\(/,
  /\btoupper\s*\(/,
  /\blower\s*\(/,
  /\bsort\s*\(/,
] as const;
