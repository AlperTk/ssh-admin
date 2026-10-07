---
name: commands
description: Build/test/run commands, toolchain, required environment variables, and CI status for ssh-admin. Read when setting up or running the project.
---

# Commands

## Toolchain
- TypeScript ^7.0.2 (ESM), esbuild ^0.28.1, vitest ^4.1.10 (+ @vitest/coverage-v8), tsx ^4.23.8. Dependencies: `@modelcontextprotocol/sdk` ^1.30.0, `ssh2` ^1.17.0.
- No Node version pinned in `package.json`; modern Node features (ESM, `import.meta.url`) are used.

## Setup & run
| Command | Runs | Purpose |
|---------|------|---------|
| `npm install` | — | Install dependencies |
| `npm run build` | `tsc && node build.mjs` | Type-check (emits declarations) then esbuild-bundle to `dist/bundle.cjs` |
| `npm run bundle` | `node build.mjs` | Bundle only → single-file CJS `dist/bundle.cjs` (copies `src/data/*` → `dist/data/`) |
| `npm start` | `node dist/bundle.cjs` | Run the built stdio MCP subprocess |
| `npm run dev` | `tsx src/index.ts` | Run from source during development |

## Test
| Command | Runs | Purpose |
|---------|------|---------|
| `npm test` | `vitest run` | Run all tests once (includes `src/**/*.test.ts` + `test/**/*.test.ts`) |
| `npm run test:watch` | `vitest` | Watch mode |
| coverage | via `@vitest/coverage-v8` | A `coverage/` directory exists at repo root |

## Lint / format / static analysis
- **None configured.** No ESLint/Prettier in dependencies; type-safety is enforced by `tsc` (strict mode) during `npm run build`.

## Database / migrations
- None. Persistence is a local JSON registry at `~/.ssh-admin/hosts.json`.

## Environment variables
| Variable | Required | Purpose |
|----------|----------|---------|
| `SSH_PASSWORD_<ALIAS>` | optional (per host) | Password for a host `<alias>`; kept in env, never stored in the registry |
| `SSH_AUTH_SOCK` | optional | SSH agent socket path for key-based / auth-agent authentication |
| `MCP_SSH_READONLY` | optional | `"true"` forces global readonly mode (write-block) |
| `MCP_SSH_REGISTRY_PATH` | optional | Override the registry file location (default `~/.ssh-admin/hosts.json`) |

## Consuming as an MCP server
- OpenCode `opencode.json`: `mcp.ssh-admin` → local, command `node ./ssh-admin/dist/bundle.cjs`, `env: {}`.
- CLI bin entrypoint: `ssh-admin` → `./dist/bundle.cjs` (same stdio subprocess; no argv branching).

## CI / CD
- **None found.** No `.github/workflows`, GitLab CI, or other CI configuration present in the repo.
