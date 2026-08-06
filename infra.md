# mcp-ssh — Development Info

MCP server for managing SSH servers. Provides host registry (`~/.mcp-ssh/hosts.json`), session pool, and command execution tools.

## Setup
```bash
npm install
npm run dev    # watch mode via tsx
npm test       # vitest
```

## Architecture
```
index.ts (MCP tools) → pool.ts (SSH sessions) → ssh2 Client
                ↘ registry.ts (~/.mcp-ssh/hosts.json)
```

## Adding a New Tool
1. Define params in `server.tool()` call in `src/index.ts`
2. Use `pool.open()`, `pool.close()`, `pool.list()`, `pool.executeCommand()` for SSH ops
3. Use `addServer()`, `listServers()`, `getServer()`, `updateServer()`, `deleteServer()` for registry ops
4. Wrap errors: return `{ success: false, error }` with `isError: true`

## Pool API
- `pool.open(alias)` → `{ sessionId, status }` (async)
- `pool.close(sessionId)` → `{ success, message }`
- `pool.list()` → `SessionInfo[]`
- `pool.executeCommand(sessionId, command, timeout?)` → `{ stdout, stderr, exitCode, durationMs }` (async)

## Registry API
- `addServer({ alias, host, port, username, authMethod, keyPath? })` → `HostConfig`
- `listServers()` → `HostConfig[]` (no credentials)
- `getServer(alias)` → `HostConfig`
- `updateServer(alias, { username?, authMethod?, keyPath? })` → `HostConfig`
- `deleteServer(alias)` → void
- `resolveCredentials(alias, host)` → `{ keyPath?, password? }` (throws if password missing)

## Types (src/types.ts)
- `HostConfig` — server config
- `SessionInfo` — active session metadata
- `CommandResult` — command output

## Constraints
- Max 1 session per host (auto-reuse)
- Passwords from env: `SSH_PASSWORD_<ALIAS>`
- Default timeout: 60000ms
- Registry dir auto-created at `~/.mcp-ssh/`
