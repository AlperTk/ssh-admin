---
name: domain
description: Domain concepts, business rules, invariants, and workflows of ssh-admin's connection, command, and readonly-safety model. Read when reasoning about behavior or adding rules.
---

# Domain

## Terminology
| Term | Meaning |
|------|---------|
| **readonly mode** | Global write-block flag (`MCP_SSH_READONLY==="true"` or an override) plus the always-on command checker. |
| **whitelist** | Flat array of allowed bare command names (`readonly-whitelist.json`, ~320 entries); the primary read gate. |
| **write-handler** | Per-token strategy `(cmd)=>boolean` that detects write intent for a specific command family. |
| **resolveCommand** | Peels wrappers (`sudo`/`su`/`ssh`/`env`/`timeout`/`nice`/…) to find the effective first token. |
| **substitution** | `$()` / backtick command substitution that must be recursively checked. |
| **instruction** | Prerequisite agent-instruction state (`_instructionCalled`) gating all tools. |
| **checkLayer** | Which stage produced a deny: substitution \| loop \| whitelist \| handler \| pattern. |
| **session id** | `<alias>-<8hex>`, validated by `isValidSessionId`. |

## Core entities
- `HostConfig` → `ServerRegistry` (persisted list), exposed as `ServerInfo` (secrets stripped).
- `SessionInfo` tracks a live SSH session (status: `connected` / `already_connected`).
- `CommandResult {stdout, stderr, exitCode, durationMs}`.
- Session-ID format couples a host alias to an 8-hex instance id, enforcing one-session-per-host.

## Business rules easy to violate
- **One session per host.** The pool maps host→sessionId; `open()` reuses a live mapped session (`already_connected`) and silently evicts stale (non-connected) entries before reconnecting.
- **Credentials never persisted.** Passwords come from env `SSH_PASSWORD_<ALIAS>`; keys are read from `keyPath` at connect time. `listServers` strips secrets.
- **Read vs write symmetry.** `command_execute_read` runs only whitelist-passing (read-only) commands; if blocked it tells the caller to use `_write`. `command_execute_write` rejects read-only commands and runs non-read-only ones after user approval, appending the remote audit changelog.
- **Instruction prerequisite.** `requireInstruction()` blocks every tool until `get_agent_instructions` has been called.
- **File edits are synthesized shell ops** — backup + unified diff over the existing file, with optional `dryRun` preview — not full-file rewrites.

## Invariants
- **Fail-closed:** a missing/unparseable whitelist yields an empty set and blocks everything; a missing handler still requires the pattern detector to pass.
- **Unconditional check:** `CommandChecker.check()` runs on every `command_execute_read` AND `command_execute_write` call (not gated by a mode flag).
- **Every evasion path is checked:** loops, subshells, braces, pipes, process substitution, and variable substitution all route back through `check()` recursion.
- **Consistent error shape:** denials return `{allowed:false, reason, matchedRule, checkLayer}` surfaced via `errorResponse`.
- `/dev/null` redirects and double-quoted content are treated as non-writing; the deny-list token `.` is always blocked.
- **Sentinel verification:** a connection is marked `connected` only after a round-trip sentinel echo succeeds.

## Workflows
- **Open connection:** reuse-or-connect → wait for SSH `ready` → send random-token sentinel `echo` → confirm output → store verified session → return sessionId + `~/server-info` tree. Keepalive = `max(10000, timeout/3)` ms, countMax 10.
- **Execute command:** guard (instruction / write / session) → checker gate → `pool.executeCommand` → ssh2 exec stream → `CommandResult` → response envelope.
- **Write audit:** approved write ops append an entry to remote `~/server-info/changelog.log`, rotated at 500 lines.
