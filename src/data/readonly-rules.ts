// Git komutları: yazma işlemi yapan alt komutlar
export const GIT_WRITE_COMMANDS = [
  'commit', 'push', 'merge', 'rebase', 'reset', 'clean',
  'am', 'apply', 'bisect', 'cherry-pick', 'force-push',
  'clone', 'pull', 'fetch', 'checkout', 'restore',
  'stash', 'revert', 'add', 'rm', 'mv',
  'gc', 'prune', 'replace', 'filter-branch',
  'init', 'bare', 'signoff',
] as const;

export const GIT_STASH_READ_ONLY = ['list', 'show', 'push'] as const;

// journalctl: write flag'ler engellenir, okuma flag'leri izinli
export const JOURNALCTL_WRITE_FLAGS = new Set([
  '--vacuum-size', '--vacuum-time', '--vacuum-files',
  '--rotate', '--flush', '--sync',
  '--relinquish-mount', '--disk-size', '--max-file-size', '--compress',
  '--move-catalog', '--compress-catalog',
  '--no-reorder', '--header',
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

export const IP_WRITE_COMMANDS = new Set([
  'add', 'del', 'change', 'chg', 'replace', 'flush', 'set',
  'create', 'destroy', 'remove', 'save', 'restore',
]);

export const IP_WRITE_SUBCOMMANDS = new Map<string, string[]>([
  ['addr', ['add', 'del', 'flush']],
  ['link', ['set', 'add', 'del', 'delete', 'change', 'chg', 'replace']],
  ['route', ['add', 'del', 'change', 'chg', 'replace', 'append']],
  ['neigh', ['add', 'del', 'replace', 'chgr']],
  ['rule', ['add', 'del', 'flush']],
  ['tunnel', ['add', 'del', 'change', 'chg', 'replace']],
  ['maddr', ['add', 'del', 'change', 'chg', 'replace']],
]);

// apt: sadece read-only alt komutlar izinli
export const APT_READ_ONLY = new Set([
  'list', 'show', 'search', 'policy', 'info', 'cache', 'depends',
  'rdepends', 'madison', 'edit-sources', 'full-upgrade', 'dist-upgrade',
  'update', 'upgrade', 'check', 'simulator', 'autoremove',
]);

export const APT_WRITE_COMMANDS = new Set([
  'install', 'remove', 'purge', 'reinstall', 'hold', 'unhold',
  'lock', 'unlock', 'clean', 'autoclean', 'fix-broken',
]);

// docker: sadece read-only alt komutlar izinli
export const DOCKER_READ_ONLY = new Set([
  'ps', 'images', 'inspect', 'logs', 'top', 'stats', 'version', 'info',
  'diff', 'port', 'events', 'pull', 'config', 'node', 'service', 'task',
  'volume', 'network', 'plugin', 'secret', 'swarm', 'container', 'image',
  'system',
]);

export const DOCKER_WRITE_COMMANDS = new Set([
  'rm', 'rmi', 'prune', 'stop', 'start', 'restart', 'kill', 'run',
  'update', 'rename', 'tag', 'push', 'save', 'load', 'import',
  'export', 'commit', 'cp', 'attach', 'wait', 'build', 'create',
  'pause', 'unpause', 'resize', 'modify',
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
export const TAR_CREATE_SHORT_RE = /\bc[a-zA-Z]*f/;
export const TAR_CREATE_LONG_RE = /--create/;
export const TAR_CF_RE = /-c\s+--file/;
export const TAR_EXTRACT_SHORT_RE = /\bx[a-zA-Z]*f/;
export const TAR_EXTRACT_LONG_RE = /--extract/;
export const TAR_XF_RE = /-x\s+--file/;
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

// awk: write pattern'lar (awk program içindeki print/printf redirection, system(), getline)
export const AWK_WRITE_PATTERNS = [
  /print\s+.*>\s*\/[^n]/,
  /print\s+.*>>\s*\/[^n]/,
  /printf\s+.*>\s*\/[^n]/,
  /printf\s+.*>>\s*\/[^n]/,
  /\bsystem\s*\(/,
  /\bgetline\s*<\s*\/[^n]/,
  /\bgetline\s*\|\//,
] as const;
