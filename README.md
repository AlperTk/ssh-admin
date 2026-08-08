# mcp-ssh

MCP (Model Context Protocol) server for managing SSH connections to remote servers. Provides host registry, session pool, and secure command execution with read-only protection.

## Features

- **Server Registry**: Add, list, update, delete SSH server configurations with mtime-based caching
- **Connection Pool**: Automatic session deduplication (max 1 per host), graceful reconnect
- **Command Execution**: Run shell commands on active SSH sessions with whitelist + write pattern detection
- **Raw Command Execute**: Unfiltered command execution with changelog logging and user approval
- **Readonly Mode**: Optional strict read-only mode that blocks all write operations and registry mutations
- **Secure Credentials**: Passwords stored in environment variables, never in the registry
- **Graceful Shutdown**: SIGTERM/SIGINT handling with clean session teardown

## Installation

```bash
npm install
npm run build
```

## Configuration

### Adding Servers

Use the `registry_add_server` tool to add servers:

```json
{
  "name": "registry_add_server",
  "arguments": {
    "alias": "prod-web",
    "host": "192.168.1.100",
    "port": 22,
    "username": "deploy",
    "authMethod": "key",
    "keyPath": "~/.ssh/id_ed25519"
  }
}
```

For password auth:

```json
{
  "name": "registry_add_server",
  "arguments": {
    "alias": "staging-db",
    "host": "10.0.0.50",
    "port": 2222,
    "username": "admin",
    "authMethod": "password"
  }
}
```

Then set the password via environment variable:
```bash
export SSH_PASSWORD_STAGING_DB="your_password_here"
```

### Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build && npm start

# Readonly mode (blocks registry writes + all command modifications)
MCP_SSH_READONLY=true npm run dev
```

## MCP Tools

### Registry Tools

| Tool | Description |
|------|-------------|
| `registry_add_server` | Add a new SSH server to the registry |
| `registry_list_servers` | List all registered servers (credentials hidden) |
| `registry_get_server` | Get details of a specific server |
| `registry_update_server` | Update server properties (cannot change host/port) |
| `registry_delete_server` | Remove a server from the registry |

### Connection Tools

| Tool | Description |
|------|-------------|
| `connection_open` | Open an SSH connection, returns sessionId |
| `connection_close` | Close an open SSH session |
| `connection_list` | List all active sessions |

### Command Tools

| Tool | Description |
|------|-------------|
| `command_execute` | Execute command on an open session (whitelist + write pattern protected) |
| `command_execute_raw` | Execute commands without filtering (changelog logging + user approval required) |
| `instruction` | Returns system prompt / agent instructions (call first) |

## Usage Flow

```
1. instruction                              → get agent instructions
2. registry_list_servers                    → see available hosts
3. connection_open(alias="prod")            → get sessionId
4. command_execute(sessionId, "uptime")     → run first command
5. command_execute(sessionId, "df -h")      → run second command on same session
6. command_execute_raw(sessionId, "systemctl restart nginx") → modify system
7. connection_close(sessionId)              → close session
```

## ~/server-info/ Structure

Each server has persistent information stored in its `~/server-info/` directory. These files are updated and read by the AI.

### Files

- **services.md** — Installed services and their status
- **packages.md** — Installed critical packages
- **rules.md** — Server constraints and rules
- **decisions.md** — Decisions made and their rationale
- **architecture.md** — Architecture notes and configuration details
- **changelog.log** — Commands executed via command_execute_raw (auto-append)

### Directories

- **knowledge/** — Knowledge files (.md) created and maintained by the AI
  - Each .md file represents a topic or knowledge domain
  - AI adds or updates files as it learns new server information
- **scripts/** — Reusable scripts for frequently performed operations
  - Store automation scripts here to speed up common tasks
  - AI creates and maintains scripts based on recurring operational patterns

### Usage Rules

- **Read operations:** Use `command_execute` (protected by whitelist + write pattern detection)
- **Permanent changes:** Use `command_execute_raw` (unfiltered + user approval required)
  - Read-only commands are blocked in `command_execute_raw` → use `command_execute` instead
- Files are updated by AI when system changes occur
- AI reads these files to get server information when needed

## Security

### Command Protection

Every command goes through a three-layer defense:

1. **Whitelist** — Unknown commands are blocked (e.g., python, node, perl, ruby, mount, screen, tmux, dd, zip, gzip)
2. **Write Argument Detection** — Even whitelisted commands are checked for write flags (e.g., `tar cf`, `systemctl restart`, `docker run`, `git add`)
3. **Redirection Detection** — File write operators (`>`, `>>`) are blocked

No bypass is possible. No permanent modifications can be made through `command_execute`.

### Readonly Mode

When `MCP_SSH_READONLY=true`:
- Registry write tools (`registry_add_server`, `registry_update_server`, `registry_delete_server`) are disabled
- All commands pass through whitelist + write pattern checks
- No permanent changes can be made to any server

### Credentials & Storage

- Passwords are **never** stored in the registry
- Use environment variables: `SSH_PASSWORD_<ALIAS>` (uppercase alias)
- Key-based auth is recommended for production use
- Registry directory: `~/.mcp-ssh/` with mode `0700`
- Registry file: `hosts.json` with mode `0600`
- Password memory is wiped immediately after credential verification

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Connection timeout | 5000ms | SSH connection establishment timeout |
| Command timeout | 60000ms | Command execution timeout |
| Keepalive interval | max(10s, timeout/3) | SSH keepalive interval |
| Keepalive count | 10 | Number of failed keepalives before disconnect |
| Verification timeout | max(30s, timeout) | Connection verification timeout |
| forceIPv4 | false | Force IPv4 connections (set per host in registry) |

## Development

```bash
npm install          # Install dependencies
npm run dev          # Watch mode via tsx
npm test             # Run tests (477 tests)
npm run build        # TypeScript compile + bundle
```

## License

MIT
