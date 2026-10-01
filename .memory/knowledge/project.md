# ssh-admin — Project Scope & Core Requirements

## What it is
An MCP (Model Context Protocol) server for managing SSH connections to remote servers. It gives an LLM agent secure, structured access to a fleet of hosts: a host registry, a reusable SSH session pool, and guarded command execution with read-only protection.

## Core purpose
Give an AI agent safe, repeatable control over remote Linux servers — list/add/update/delete hosts, open/reuse/close SSH sessions, run commands, edit files, and log changes — while preventing accidental or malicious writes via a three-layer read-only defense.

## Core capabilities
1. **Host registry** — persistent store at `~/.ssh-admin/hosts.json` (dir 0700, file 0600). Add / list / update / delete servers; mtime-based caching; credentials resolved from env vars (`SSH_PASSWORD_<ALIAS>`), never stored on disk.
2. **Connection pool** — max 1 session per host, auto-reuse, graceful reconnect, keepalive, SIGTERM/SIGINT shutdown. Session IDs formatted `<alias>-<short-hex>`.
3. **Command execution** — `command_execute` (guarded) + `command_execute_raw` (unfiltered, with changelog logging + user approval).
4. **File editing** — replace/range modes, dryRun, temp backup, diff output.
5. **Instruction guard** — `requireInstruction()` enforcement before sensitive operations.

## Security model (three-layer read-only defense)
1. **Whitelist** — only ~321 allowed command names (see `src/data/readonly-whitelist.json`).
2. **Write-arg detection** — per-command handlers detect write subcommands/flags (git, docker, systemctl, curl/wget, ip, apt, crontab, firewall-cmd, sysctl, ar, strip, objcopy, fail2ban, journalctl, awk, scp, tar, partx, kpartx, dmsetup, snap, tune2fs, ufw, iptables, scriptreplay, partprobe, hostname, trap, alias).
3. **Redirection/pattern detection** — catches shell redirections and substitution/loop tricks.

No bypass possible. Strict readonly mode via `MCP_SSH_READONLY=true`.

## MCP tools exposed
- **registry** (5): add / list / update / delete server, resolve credentials
- **connection** (3): open / close / list
- **command** (2): `command_execute`, `command_execute_raw`
- **file-edit**: replace / range
- **instruction**: set instruction state

## Configuration defaults (all in `src/constants.ts`)
- `DEFAULT_CONNECTION_TIMEOUT_MS`: 5000ms
- `DEFAULT_COMMAND_TIMEOUT_MS`: 60000ms
- `AUDIT_COMMAND_TIMEOUT_MS`: 5000ms
- Keepalive interval: max(10s, timeout/3), count 10
- Verification timeout: max(30s, timeout)
- `forceIPv4`: false

## Connection verification
Uses a per-call unique sentinel token (`__SSH_ADMIN_VERIFY_<uuid>__`) rather than exact `echo ping` matching. Robust against extra shell output (bashrc, MOTD, etc.).

## Per-server knowledge structure (documented in README)
`~/server-info/<host>/` → services.md, packages.md, rules.md, decisions.md, architecture.md, changelog.log, knowledge/, scripts/

## Non-negotiable requirements
- Passwords never persisted to disk; memory-wiped after use.
- File permissions enforced (0700 dir / 0600 file).
- Consistent response shape: success `{ success: true, data }`, error `{ success: false, error }` (+ optional `code` from `ErrorCode`).
- Max 1 session per host; auto-reuse; clean stale state.
- All external I/O centralized through repository/service modules (never direct fs/db access from handlers).
- Changelog audit is sequenced AFTER the main command resolves (no ordering race).
- All errors carry a typed `ErrorCode` (closed union in `errors.ts`).

## Error model
- Single `AppError` class in `errors.ts` with closed `ErrorCode` union: `NOT_FOUND | DUPLICATE | INVALID_INPUT | CONNECTION_FAILED | COMMAND_FAILED | TIMEOUT | READONLY_BLOCKED | INSTRUCTION_REQUIRED | INTERNAL_ERROR`.
- `formatError` extracts `{ message, code? }`; `errorResponse(message, code?)` threads the code into the JSON payload.
- All tool handlers use `handleToolCall(fn)` wrapper from `response.ts` for centralized try/catch + error formatting.
