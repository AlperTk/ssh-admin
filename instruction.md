# Agent Instructions

This MCP server is used to manage SSH servers.

## ~/server-info/ Structure

Each server has persistent information stored in its `~/server-info/` directory. These files are updated and read by the AI.

### Files

- **services.md** — Installed services and their status
- **packages.md** — Installed critical packages
- **rules.md** — Server constraints and rules
- **decisions.md** — Decisions made and their rationale
- **architecture.md** — Architecture notes and configuration details
- **logs/changelog.log** — Commands executed via command_execute_raw (auto-append)

### Usage Rules

- **Read operations:** Use `command_execute` (protected by whitelist + write pattern detection)
- **Permanent changes:** Use `command_execute_raw` (unfiltered + user approval required)
- Files are updated by AI when system changes occur
- AI reads these files to get server information when needed
