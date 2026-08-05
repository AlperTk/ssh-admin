# mcp-ssh

MCP (Model Context Protocol) server for managing SSH connections to remote servers.

## Features

- **Server Registry**: Add, list, update, delete SSH server configurations
- **Connection Management**: Open/close SSH sessions with automatic deduplication (max 1 per host)
- **Command Execution**: Run shell commands on active SSH sessions
- **Secure Credentials**: Passwords stored in environment variables, never in the registry

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
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `registry_add_server` | Add a new SSH server to the registry |
| `registry_list_servers` | List all registered servers (credentials hidden) |
| `registry_get_server` | Get details of a specific server |
| `registry_update_server` | Update server properties (cannot change host/port) |
| `registry_delete_server` | Remove a server from the registry |
| `connection_open` | Open an SSH connection, returns sessionId |
| `connection_close` | Close an open SSH session |
| `connection_list` | List all active sessions |
| `command_execute` | Execute command on an open session |

## Usage Flow

```
1. registry_list_servers          → see available hosts
2. connection_open(alias="prod")  → get sessionId
3. command_execute(sessionId, "uptime")   → run first command
4. command_execute(sessionId, "df -h")     → run second command on same session
5. command_execute(sessionId, "ps aux")    → run third command on same session
6. connection_close(sessionId)   → close session
```

## Registry Storage

Server configurations are stored in `~/.mcp-ssh/hosts.json`.

## Security

- Passwords are **never** stored in the registry
- Use environment variables: `SSH_PASSWORD_<ALIAS>` (uppercase alias)
- Key-based auth is recommended for production use
