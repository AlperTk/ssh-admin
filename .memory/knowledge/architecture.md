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
├── index.ts              # Entry point — wires components only, no domain logic
├── types.ts             # Shared types (HostConfig, ServerInfo, ServerRegistry, CommandResult, SessionInfo)
├── tokenizer.ts         # Command parsing/tokenization (getFirstToken, skipShortFlags)
├── response.ts          # Response helpers (successResponse, errorResponse, formatError)
├── errors.ts            # Single AppError class (domain errors with codes)
├── pool.ts              # ConnectionPool — ssh2 session pool (singleton instance `pool`)
├── registry.ts          # Host registry repository (~/.ssh-admin/hosts.json, mtime cache)
├── readonly-guard.ts    # Readonly mode toggle (isReadonlyMode, requireWrite, set/resetReadonlyMode)
├── instruction-guard.ts # requireInstruction() enforcement
├── log-changelog.ts     # Changelog command builder + logging
├── file-edit.ts         # File edit command builders (replace/range, dryRun, backup, diff)
├── tools/               # MCP tool registrars (thin wiring)
│   ├── registry-tools.ts
│   ├── connection-tools.ts
│   ├── command-tools.ts
│   ├── file-edit-tools.ts
│   └── instruction-tools.ts
├── readonly-checker.ts  # Readonly checker entry (delegates to CommandChecker)
├── readonly-checker/    # Three-layer read-only defense
│   ├── command-checker.ts        # CommandChecker singleton (direct Map.get dispatch)
│   ├── resolution/command-resolver.ts  # sudo/su/ssh wrapper peel-through
│   ├── parsing/loop-extractor.ts       # Loop extraction
│   ├── parsing/substitution-detector.ts# Substitution detection
│   ├── write-patterns/write-pattern-detector.ts  # Redirection/pattern detection
│   └── write-handlers/           # ~25 per-command write handlers (Strategy pattern)
└── data/
    ├── readonly-whitelist.json   # ~321 allowed command names
    └── readonly-rules.ts         # Rule definitions
test/                    # Per-module *.test.ts (mirrors src/), ~509 tests
config/hosts.example.json# Example host registry
```

## Design patterns in use
- **Singleton / Module:** shared global state exported as one instance — `CommandChecker` (`checker`), `ConnectionPool` (`pool`). Never create multiple instances.
- **Strategy:** per-command write behavior encapsulated as separate handler files/functions in `readonly-checker/write-handlers/`. The orchestrator (`CommandChecker`) stays thin; add new commands as new handler files, not inline conditionals.
- **Repository:** all registry I/O goes through `registry.ts` exported functions (addServer/listServers/getServer/updateServer/deleteServer/resolveCredentials). Consumers never touch the filesystem directly.
- **Factory:** object/command construction from config → factory functions (`buildChangelogCommand`, `buildFileEditCommand`, `buildReplaceCommand`, `buildRangeCommand`).
- **Observer:** event-driven state management via listeners/emitters; clean up on teardown.

## Key architectural rules
- **Entry point is thin:** `index.ts` only wires components together — no domain logic.
- **Centralized I/O:** filesystem/SSH access only through repository/service modules (registry, pool). Handlers never access storage directly.
- **Shared parsing:** tokenization lives in `tokenizer.ts`; do not duplicate across handlers.
- **Consistent responses:** `{ success: true, data }` / `{ success: false, error }` via `response.ts` helpers.
- **Single error type:** `AppError` in `errors.ts` with codes/tags; never swallow errors.
- **Type safety:** no `any` (use `unknown` + type guards); discriminated unions for error/success shapes; `strict: true`.
- **State lifecycle:** max 1 session per host; auto-reuse; clean stale state; update usage metadata per operation.
- **Methods < 40 lines.** Follow existing style. Optimize only after correctness.

## Read-only checker flow (core security path)
1. Tokenize command (`tokenizer.ts`).
2. Resolve through wrappers (sudo/su/ssh peel-through) via `command-resolver.ts`.
3. Check first token against whitelist (`data/readonly-whitelist.json`).
4. Dispatch to per-command write handler (`write-handlers/`) for write-arg detection.
5. Run redirection/pattern detection (`write-patterns/`, `parsing/`).
6. Any layer flags a write → block (unless raw mode with approval).

## Testing conventions
- Per-module `*.test.ts` mirroring `src/` structure under `test/`.
- Mock external deps (no real servers/fs/db).
- Categories: happy path, blocked/error, combined scenarios, edge cases, bypass detection.
- Run: `npm test` (vitest). ~509 tests.
