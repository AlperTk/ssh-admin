---
name: architecture
description: Module map, request/data flow, external integrations, entry points, and key architectural decisions. Read when changing structure or adding an integration.
---

# Architecture

## Modules & responsibilities
| Module | Responsibility |
|--------|----------------|
| `src/index.ts` | Entry point: builds `McpServer("ssh-admin")`, registers all tool groups, connects `StdioServerTransport`; SIGTERM/SIGINT → `pool.closeAll()` + exit. |
| `src/pool.ts` | `ConnectionPool` (singleton `pool`): owns ssh2 `Client`s, enforces max-1-session-per-host, auto-reuses live sessions, sentinel-verifies connections, per-command timeout, tracks `lastUsed`. |
| `src/session.ts` | Session-ID contract: `SESSION_ID_RE` (`<alias>-<8hex>`) + `isValidSessionId` guard. |
| `src/registry.ts` | Host-registry CRUD + persistence at `~/.ssh-admin/hosts.json` (mtime cache, atomic `0o600` write); `resolveCredentials` reads secrets from env/path, never stores them. |
| `src/response.ts` | `successResponse` / `errorResponse` envelopes + `handleToolCall` try/catch wrapper for every tool. |
| `src/errors.ts` | `AppError` base class + `ErrorCode` union (NOT_FOUND, DUPLICATE, INVALID_INPUT, CONNECTION_FAILED, COMMAND_FAILED, TIMEOUT, READONLY_BLOCKED, INSTRUCTION_REQUIRED, INTERNAL_ERROR). |
| `src/types.ts` | Shared types: `HostConfig`, `ServerInfo`, `SessionInfo`, `CommandResult`, `ServerRegistry`. |
| `src/server-info.ts` | `buildDiscoveryCommand()`: shell one-liner tree-listing `~/server-info` returned on connect. |
| `src/log-changelog.ts` | Appends write-op entries to remote `~/server-info/changelog.log` with rotation (max 500 lines). |
| `src/instruction-guard.ts` | Global `requireInstruction()` gate — blocks all tools until `get_agent_instructions` is called. |
| `src/readonly-guard.ts` | Mode flags (`getReadonlyMode` / `requireWrite`) for the global readonly switch. |
| `src/readonly-checker/**` | Security subsystem: read-vs-write discriminator + evasion detection (see `domain.md`). |
| `src/tokenizer.ts` | Quote-aware command tokenization (`getFirstToken`, `skipShortFlags`). |
| `src/tools/*.ts` | Five registration modules: registry-, connection-, command-, file-edit-, instruction-tools. |

## Request flow
```
OpenCode (opencode.json) ─stdio─▶ index.ts main()
   McpServer.connect(StdioServerTransport); 12 tools registered

tool call (e.g. command_execute_read {sessionId, command})
  ▼ handleToolCall(fn) [response.ts]          ← catch → errorResponse(code)
  ├ requireInstruction()                       ← block until get_agent_instructions called
  ├ requireWrite()                             ← write-only ops only
  ├ isValidSessionId(sessionId)
  ├ checker.check(command)  [readonly-checker] ← HAND-OFF to security subsystem
  │     read path : allowed ⇒ run | blocked ⇒ error("use command_execute_write")
  │     write path: !allowed ⇒ run(user-approved) | allowed ⇒ error("use _read")
  ▼ pool.executeCommand(sessionId, cmd, timeout)  [pool.ts]  (lastUsed=now)
  ▼ session.client.exec(cmd, {env:TERM:xterm})    [ssh2 ClientChannel]
  ▼ CommandResult {stdout, stderr, exitCode, durationMs}
  ▼ successResponse(data) / errorResponse(msg, code)  → back over stdio
```

## External integrations
- **@modelcontextprotocol/sdk** — `McpServer` + `StdioServerTransport`; tools registered via `registerTool(name,{title,description,inputSchema},handler)` and legacy `tool(name,desc,handler)`. Defines the stdio request/response envelope.
- **ssh2** — persistent SSH `Client`s; `client.exec()` returns a `ClientChannel` (stdout/stderr/exit streams) used for every remote command, verification sentinel, and file edit.

## Persistence & state
- Registry: `~/.ssh-admin/hosts.json` (override via `MCP_SSH_REGISTRY_PATH`), dir `0o700`, file written atomically at `0o600`, cached by mtime. Secrets never stored.
- Connection pool: in-memory `Map<sessionId>` + `hostToSession: Map<host→sessionId>`. No database.
- See `commands.md` for env var reference values.

## Entry points
- MCP tools (12): `registry_add_server`, `registry_list_servers`, `registry_get_server`, `registry_update_server`, `registry_delete_server`, `connection_open`, `connection_close`, `connection_list`, `command_execute_read`, `command_execute_write`, `file_edit`, `get_agent_instructions`.
- CLI bin: running the bundle executes top-level `main()`; no argv branching — purely a stdio MCP subprocess.
- Lifecycle: startup = module-level `main().catch(exit 1)`; shutdown = SIGTERM/SIGINT → `pool.closeAll()` + `process.exit(0)`.

## Key architectural decisions
1. **Stdio subprocess model, no network listener** — consumed as a child process; teardown only via signals calling `pool.closeAll()`. Single instance per host.
2. **Max-1-session-per-host with silent auto-reuse** — avoids duplicate connections / credential contention; `open()` is idempotent against a live session.
3. **Credentials never persisted** — passwords via env `SSH_PASSWORD_<ALIAS>` (uppercase), keys read from `keyPath` at connect time; `listServers` strips secrets; registry locked `0o600`. Security-first (see `constraints.md`).
4. **Read-only vs write split enforced by the readonly-checker handoff** — `_read` runs only whitelist-passing commands automatically; `_write` routes through user approval and appends a remote audit changelog. A global gate (`requireInstruction()`) blocks all tools until `get_agent_instructions` is called.
5. **Connection verification via round-trip sentinel** — after SSH `ready`, a random-token `echo` must round-trip before a session is trusted; rejects half-open/failed connections.
6. **Uniform response envelope + typed error codes** — every tool returns `{success:true,data}` or `{success:false,error,code?}` via `handleToolCall`; `AppError.code` standardizes failures. File edits are synthesized as remote shell commands (backup + diff), not full-file rewrites.
