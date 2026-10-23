---
name: project
description: What ssh-admin is, who it serves, and its technology stack. Read first when onboarding to the repo.
---

# Project

## Purpose
`ssh-admin` is an **MCP server** that manages SSH connections to remote servers and runs commands/files over them with a strict read-only safety model. It gives agents a governed way to administer remote hosts: a host registry, a connection pool, and secure command/file operations where writes are explicitly separated from reads.

## Scope
- In: host registry CRUD, SSH connection pooling, read vs write command execution, remote file editing, audit changelog, graceful shutdown.
- Out: not a general SSH client or UI — it is a tool server consumed over stdio by an MCP client (OpenCode). It holds no database; all state is a local JSON registry plus in-memory connections.

## Core use cases
1. Manage the host registry: `registry_add_server` / `_list_servers` / `_get_server` / `_update_server` / `_delete_server`.
2. Open/close/list SSH connections (max one session per host, auto-reused): `connection_open` / `connection_close` / `connection_list`.
3. Run read-only commands automatically when they pass the whitelist: `command_execute_whitelisted`.
4. Run write commands only after user approval, appending a remote audit changelog: `command_execute_with_approval`.
5. Edit remote files via backup + unified diff (with dry-run preview): `file_edit`.

All tools are gated behind `get_agent_instructions`, which must be called first.

## Consumers
- OpenCode agents consume it as a stdio MCP subprocess: `node ./ssh-admin/dist/bundle.cjs` (configured under `mcp.ssh-admin` in `opencode.json`). A CLI bin (`ssh-admin`) points at the same bundle but has no argv branching.
- Public upstream repository: `https://github.com/AlperTk/ssh-admin` (author `AlperTk`); consumed as a stdio MCP subprocess and npm bin `ssh-admin`.
- License: Apache License 2.0 (`LICENSE`).

## Technology stack
| Layer | Tech | Pin |
|-------|------|-----|
| Language | TypeScript (ESM, `"type":"module"`) | ^7.0.2 |
| SSH transport | `ssh2` | ^1.17.0 |
| MCP protocol | `@modelcontextprotocol/sdk` | ^1.30.0 |
| Build | esbuild → single-file CJS bundle `dist/bundle.cjs` | ^0.28.1 |
| Tests | vitest (+ v8 coverage) | ^4.1.10 |
| Dev runner | tsx | ^4.23.8 |

Node runtime floor is declared via `package.json` `engines.node` (`>=18`, maintainer-set consumer baseline) — details in `commands.md`; modern Node features (ESM, `import.meta`) are used. See `commands.md` for build/test/run syntax.

## Component overview
```
MCP client (OpenCode) ──stdio──▶ index.ts (McpServer + 12 tools)
                                    │ handleToolCall wraps every tool
                    ┌───────────────┼──────────────────────────┐
                    ▼               ▼                          ▼
              registry.ts      pool.ts / session.ts     readonly-checker/**
              (hosts.json)    (one session/host,       (read-vs-write gate +
                               ssh2 connection)         evasion detection)
```
Read vs write command execution and file edits hand off to the `readonly-checker` subsystem; see `architecture.md` for full data flow.
