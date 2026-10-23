# ssh-admin

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-blue)](#)
[![Runtime dependencies](https://img.shields.io/badge/runtime_dependencies-3-brightgreen)](#)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D18-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Npm Version](https://img.shields.io/npm/v/ssh-admin.svg)](https://www.npmjs.com/package/ssh-admin) 

**A security-conscious SSH administration MCP server for AI agents.**

`ssh-admin` lets MCP clients such as OpenCode manage remote hosts, reuse SSH connections, inspect systems, and make approved changes through a consistent set of tools. It separates read-only commands from potentially mutating operations and keeps a changelog of write actions.

## Features

- **Host registry** — add, list, inspect, update, and remove SSH host configurations.
- **Persistent SSH sessions** — reuse a verified connection per host instead of reconnecting for every command.
- **Read/write separation** — automatically execute commands accepted by the read-only checker; route other commands to a separate write tool.
- **Remote file editing** — edit files with backup and diff support, including dry-run previews.
- **Write audit trail** — record write operations in a remote changelog.
- **Credential hygiene** — load passwords from environment variables and private keys from local paths; do not persist secrets in the host registry.
- **Structured responses** — return consistent success/error results and typed error codes.

## Requirements

- Node.js **18+**
- An MCP-compatible client (for example, [OpenCode](https://opencode.ai/))
- SSH access to the remote hosts you intend to manage

## Installation

```bash
npm install -g ssh-admin
```

If you configure the client with the `npx -y` entry above, there is nothing to install manually — the registry copy resolves automatically. Contributors building from source should follow [Development](#development).

## OpenCode configuration

Add `ssh-admin` as a local MCP server in `opencode.json`:

```json
{
  "mcp": {
    "ssh-admin": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "ssh-admin"],
      "enabled": true
    }
  }
}
```

On first launch, `npx -y` fetches `ssh-admin` from the npm registry automatically — no local checkout needed. The server communicates with its MCP client over **stdio**; it does not expose a network listener.

## Tool authorization

Consuming AI agents should grant explicit per-tool permission entries rather than relying on implicit defaults. Use the key form `<mcp-server-name>_<tool-name>` for every one of the twelve registered tools, assigning each tool either `"allow"` (auto-run without prompting) or `"ask"` (presented to the client's approval flow before execution). The complete mapping below covers every tool this server registers.

```json
{
  "permissions": {
    "ssh-admin_get_agent_instructions": "allow",
    "ssh-admin_command_execute_whitelisted": "allow",
    "ssh-admin_registry_list_servers": "allow",
    "ssh-admin_connection_close": "allow",
    "ssh-admin_registry_get_server": "allow",
    "ssh-admin_connection_list": "allow",
    "ssh-admin_command_execute_with_approval": "ask",
    "ssh-admin_registry_add_server": "ask",
    "ssh-admin_registry_update_server": "ask",
    "ssh-admin_registry_delete_server": "ask",
    "ssh-admin_connection_open": "ask",
    "ssh-admin_file_edit": "ask"
  }
}
```

These grants are grouped by intent — read-only instructions and inspection tools auto-run, while everything mutating or privileged asks first:

- **Instructions & introspection (allow):** `get_agent_instructions` initializes agent usage rules; `registry_list_servers`, `registry_get_server`, and `connection_list` inspect local registry state and session health with no side effects.
- **Read path (allow):** `command_execute_whitelisted` executes commands classified as safe by the bundled read-only checker.
- **Write/privileged paths (ask):** `registry add/update/delete` mutate the local host store containing connection credentials; `connection_open` establishes an outbound privileged SSH channel; `command_execute_with_approval` appends the remote audit changelog and is gated behind explicit approval anyway; `file_edit` performs remote file mutations with backup plus unified-diff preview.
- **Defense-in-depth guardrail:** client-side allow-lists harden but never replace the bundled fail-closed read/write checker, which enforces its safety decision unconditionally regardless of any granted permission.

## How it works

1. The agent calls **`get_agent_instructions`** before using the other tools.
2. It registers or selects a host through the host registry.
3. **`connection_open`** creates a verified SSH session, or reuses an existing live session for that host.
4. The agent uses **`command_execute_whitelisted`** for commands accepted by the read-only checker.
5. Potentially mutating commands use **`command_execute_with_approval`**, subject to the MCP client's approval policy. Remote file changes use **`file_edit`**.
6. Write operations are logged to `~/server-info/changelog.log` on the remote host.

```text
MCP client (e.g. OpenCode)
          │ stdio
          ▼
      ssh-admin
          │
          ├── Host registry (local JSON)
          ├── SSH connection pool (ssh2)
          ├── Read-only command checker
          └── Command execution / file edits
                        │ SSH
                        ▼
                   Remote host
```

## Available tools

| Category | Tools | Purpose |
| --- | --- | --- |
| Instructions | `get_agent_instructions` | Initialize the agent's required tool-use instructions. |
| Registry | `registry_add_server`, `registry_list_servers`, `registry_get_server`, `registry_update_server`, `registry_delete_server` | Manage known SSH hosts. |
| Connections | `connection_open`, `connection_close`, `connection_list` | Create, reuse, close, and inspect SSH sessions. |
| Commands | `command_execute_whitelisted`, `command_execute_with_approval` | Run commands through separate read and write paths. |
| Files | `file_edit` | Apply remote file changes with backup/diff support. |

## Credentials and persistence

Host configuration is stored locally at `~/.ssh-admin/hosts.json`. Set `MCP_SSH_REGISTRY_PATH` to override that location.

- The registry directory uses `0700` permissions; registry files are written atomically with `0600` permissions.
- Passwords are resolved at connection time from environment variables named `SSH_PASSWORD_<ALIAS>` (uppercase alias).
- SSH private keys are read from the configured `keyPath` when connecting.
- Credentials are not stored in the registry, and server-list results omit secrets.
- Active SSH connections remain in memory. The pool maintains at most one session per host.

For password authentication, expose the corresponding environment variable to the MCP server process. Never commit passwords or private keys to source control.

## Security model

`ssh-admin` distinguishes between read operations and commands that may change remote state:

- **Instruction gate:** the agent must call `get_agent_instructions` before other tools become available.
- **Read-only checker:** `command_execute_whitelisted` accepts only commands classified as safe to read; rejected commands must not run through that path.
- **Write path:** `command_execute_with_approval` is distinct from read execution and is intended to require explicit client-side approval.
- **Global read-only mode:** write operations can be blocked centrally.
- **Session verification:** newly established SSH connections must pass a round-trip sentinel check before use.
- **Audit logging:** write operations append entries to a changelog on the remote host, with rotation at 500 lines.

**Important:** Approval depends on how your MCP client is configured. The read-only checker is a safety layer, not a substitute for SSH account permissions, operating-system isolation, or a restrictive client approval policy. Treat remote commands and file edits as privileged operations.

## Development

Working from source follows the same **Node ≥ 18** floor declared under `engines`:

- **Clone & install** — `git clone https://github.com/AlperTk/ssh-admin.git`, then `cd ssh-admin && npm install` (pulls the TypeScript, esbuild, and Vitest toolchain).
- **Build** — type-check and produce the single-file `dist/bundle.cjs` (`tsc && node build.mjs`) via `npm run build`.
- **Run** — launch the built stdio server with `npm start` (`node dist/bundle.cjs`), or work directly against source with `npm run dev` (`tsx src/index.ts`).
- **Test** — `npm test` runs the whole suite once.

## License

Licensed under the **Apache License 2.0**. See [LICENSE](LICENSE).

Copyright � 2026 AlperTk.
