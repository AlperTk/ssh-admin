---
name: conventions
description: How code is organized and written in ssh-admin — patterns, naming, error handling, testing, and config. Read before adding a feature or module.
---

# Conventions

## Code organization
- ESM throughout (`"type":"module"`); TypeScript with `strict: true`, target ES2022, Node16 module/resolution, declaration + source maps enabled.
- `src/index.ts` wires components only (builds `McpServer`, registers tools, connects transport). No domain logic lives there.
- Tool groups live in `src/tools/*.ts`, each exporting a `register*Tool*` function; new tools go into the matching module.
- Shared state uses the singleton/module pattern: `ConnectionPool` is exported as a single `pool` instance — never instantiate multiple.
- Shared readonly rules/whitelist data live in `src/data/` and are copied to `dist/data/` by the build.

## Patterns (preferred)
- **Strategy pattern** for command write-detection: a plain handler `(cmd)=>boolean` keyed by first token in a `Map`. Add a new command family as a new handler file/function — do not grow inline conditionals in the checker.
- **Repository pattern** for registry I/O: all CRUD goes through `registry.ts` exports; consumers never touch the filesystem directly.
- **Factory** for response envelopes: use `successResponse(data)` / `errorResponse(message, code)` instead of hand-building shapes.
- **Observer/lifecycle** for signals: SIGTERM/SIGINT handlers call `pool.closeAll()` and exit.

## Error handling
- Use `AppError` subclasses / the `ErrorCode` union for structured failures; never swallow errors — log or propagate.
- Every tool is wrapped in `handleToolCall(fn)`, which catches and converts to `errorResponse(code)`.
- Response contract: success `{content:[{type:"text", text: JSON.stringify({success:true,data},null,2)}]}`; error sets `isError:true`.

## Naming & style
- Keep methods under 40 lines. Prefer simple conditionals over premature abstraction; introduce an abstraction only at a third similar case (KISS/YAGNI).
- Use `unknown` + type guards (not `any`) for dynamic shapes; use discriminated unions for error/success shapes.
- SOLID + DRY: separate business logic from infrastructure; centralize repeated error/data/parsing/validation logic into shared helpers.

## Testing
- Framework: vitest (globals on, node env); tests live in `test/**` (mirroring modules) plus co-located `*.test.ts`.
- Mock external deps (ssh2, MCP SDK, filesystem) — never test against real servers.
- Cover five categories: happy path, blocked/error cases, combined scenarios, edge cases, and **bypass detection** (every evasion attempt must be caught).
- Run with `npm test` (see `commands.md`).

## Configuration
- Behavior is driven by env vars (see the table in `commands.md`): `MCP_SSH_READONLY`, `MCP_SSH_REGISTRY_PATH`, `SSH_PASSWORD_<ALIAS>`, `SSH_AUTH_SOCK`. Check mode flags at the top of handlers.

## Checklist — adding a feature
1. Define types in `src/types.ts`.
2. Implement logic in the appropriate module (tools group, or a new module for a new domain area).
3. Wire it in `index.ts` via existing registration APIs — never access storage/SSH directly.
4. Wrap errors consistently (`successResponse` / `errorResponse`).
5. If it affects safety modes (readonly, permissions), add validation in the relevant guard/checker.
