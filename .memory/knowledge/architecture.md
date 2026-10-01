# ssh-admin — Architecture & Conventions

## Tech stack
- **Language:** TypeScript (ESM, `"type": "module"`), target ES2022, Node16 module resolution, `strict: true`.
- **Runtime deps:** `@modelcontextprotocol/sdk` ^1.30.0 (MCP server), `ssh2` ^1.17.0 (SSH transport), `typescript` ^7.0.2.
- **Dev tooling:** vitest ^4.1.10 (+ @vitest/coverage-v8), esbuild ^0.28.1 (bundling), tsx ^4.23.8 (dev runner), @types/node, @types/ssh2, @types/jest.
- **Build:** `tsc` → `dist/`, then esbuild bundle → `dist/bundle.cjs` (bin `ssh-admin`).
- **Scripts:** `npm run build` (tsc && node build.mjs), `npm run dev` (tsx src/index.ts), `npm test` (vitest run), `npm start` (node dist/bundle.cjs).

## Directory layout & conventions
```
src/
├── index.ts              # Entry point — wires components only, no domain logic (reads version from package.json)
├── types.ts             # Shared types (HostConfig, ServerInfo, ServerRegistry, CommandResult, SessionInfo)
├── tokenizer.ts         # Command parsing/tokenization (getFirstToken, skipShortFlags, tokenize) — single source of truth
├── response.ts          # Response helpers (successResponse, errorResponse, formatError, handleToolCall)
├── errors.ts            # AppError class + closed ErrorCode union type
├── constants.ts         # Named constants (DEFAULT_COMMAND_TIMEOUT_MS, DEFAULT_CONNECTION_TIMEOUT_MS, AUDIT_COMMAND_TIMEOUT_MS)
├── session.ts           # isValidSessionId() helper (shared session-ID validation)
├── pool.ts              # ConnectionPool — ssh2 session pool (singleton `pool`, decomposed private methods, sentinel verification)
├── registry.ts          # Host registry repository (~/.ssh-admin/hosts.json, mtime cache, AppError throws)
├── readonly-guard.ts    # Readonly mode toggle (isReadonlyMode, requireWrite, set/resetReadonlyMode, logReadonlyMode)
├── instruction-guard.ts # requireInstruction() enforcement
├── log-changelog.ts     # Changelog command builder + auditChangelog() shared function
├── file-edit.ts         # File edit command builders (replace/range, dryRun, backup, diff)
├── server-info.ts       # buildDiscoveryCommand() — server-info tree discovery command
├── tools/               # MCP tool registrars (thin wiring, all use handleToolCall)
│   ├── registry-tools.ts
│   ├── connection-tools.ts
│   ├── command-tools.ts
│   ├── file-edit-tools.ts
│   └── instruction-tools.ts
├── readonly-checker.ts  # Barrel re-export (delegates to CommandChecker)
├── readonly-checker/    # Three-layer read-only defense
│   ├── data-access.ts        # loadWhitelist() — repository-style whitelist I/O with graceful fallback
│   ├── command-checker.ts    # CommandChecker singleton (thin orchestrator + per-layer private methods)
│   ├── resolution/command-resolver.ts  # sudo/su/ssh wrapper peel-through (re-exports getFirstToken)
│   ├── parsing/loop-extractor.ts       # Loop extraction
│   ├── parsing/substitution-detector.ts# Substitution detection
│   ├── write-patterns/write-pattern-detector.ts  # Redirection/pattern detection
│   └── write-handlers/           # ~25 per-command write handlers (Strategy pattern)
└── data/
    ├── readonly-whitelist.json   # ~321 allowed command names
    └── readonly-rules.ts         # Rule definitions
test/                    # Per-module *.test.ts (mirrors src/), 551 tests
config/hosts.example.json# Example host registry
```

## Design patterns in use
- **Singleton / Module:** shared global state exported as one instance — `CommandChecker` (`checker`), `ConnectionPool` (`pool`). Never create multiple instances.
- **Strategy:** per-command write behavior encapsulated as separate handler files/functions in `readonly-checker/write-handlers/`. The orchestrator (`CommandChecker`) stays thin; add new commands as new handler files, not inline conditionals.
- **Repository:** all registry I/O goes through `registry.ts` exported functions. Whitelist I/O goes through `readonly-checker/data-access.ts`. Consumers never touch the filesystem directly.
- **Factory:** object/command construction from config → factory functions (`buildChangelogCommand`, `buildFileEditCommand`, `buildReplaceCommand`, `buildRangeCommand`).
- **Observer:** event-driven state management via listeners/emitters; clean up on teardown.
- **Wrapper/Handler:** `handleToolCall(fn)` in `response.ts` centralizes try/catch + error formatting for all MCP tool handlers. Eliminates repeated boilerplate.

## Key architectural rules
- **Entry point is thin:** `index.ts` only wires components together — no domain logic (banner in `readonly-guard.ts`, version from `package.json`).
- **Centralized I/O:** filesystem/SSH access only through repository/service modules (registry, pool, data-access). Handlers never access storage directly.
- **Shared parsing:** `getFirstToken` lives in `tokenizer.ts` (single source of truth); re-exported via `command-resolver.ts` and `base-handler.ts`. Do not duplicate.
- **Shared session validation:** `isValidSessionId()` in `session.ts`; used by all tool files.
- **Shared changelog audit:** `auditChangelog()` in `log-changelog.ts`; sequenced after main command resolves.
- **Consistent responses:** all tool handlers use `handleToolCall(fn)` → `{ success: true, data }` / `{ success: false, error, code? }`.
- **Single error type:** `AppError` in `errors.ts` with closed `ErrorCode` union; never swallow errors; code threaded through `formatError` → `errorResponse`.
- **Type safety:** zero `any` in `src/` (use `unknown` + type guards); `SessionInfo` unified in `types.ts`; `strict: true`.
- **State lifecycle:** max 1 session per host; auto-reuse; clean stale state; update usage metadata per operation.
- **Methods < 40 lines.** `ConnectionPool.open` decomposed into 8 private helpers; `CommandChecker.check` into per-layer private methods. Follow existing style. Optimize only after correctness.
- **Named constants:** all timing values in `constants.ts`; no magic numbers in tool/pool files.

## Read-only checker flow (core security path)
1. Tokenize command (`tokenizer.ts`).
2. Check process substitutions (`substitution-detector.ts`).
3. Resolve through wrappers (sudo/su/ssh peel-through) via `command-resolver.ts`.
4. Check first token against whitelist (loaded via `data-access.ts` → `data/readonly-whitelist.json`).
5. Dispatch to per-command write handler (`write-handlers/`) for write-arg detection.
6. Run redirection/pattern detection (`write-patterns/`, `parsing/`).
7. Any layer flags a write → block (unless raw mode with approval).

The `CommandChecker.check` orchestrator delegates to per-layer private methods: `runSubstitutionCheck`, `checkSegment`, `checkPipeSegment`, `denyResult`.

## Testing conventions
- Per-module `*.test.ts` mirroring `src/` structure under `test/`.
- Mock external deps (no real servers/fs/db).
- Categories: happy path, blocked/error, combined scenarios, edge cases, bypass detection.
- Run: `npm test` (vitest). 551 tests across 29 files.
- Dedicated test files: `tokenizer.test.ts` (24 tests), `instruction-guard.test.ts` (7 tests), `response.test.ts` (includes `handleToolCall` tests).
