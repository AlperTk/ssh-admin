---
name: constraints
description: Normative MUST/MUST NOT rules for security, compatibility, and consistency in ssh-admin. Read before any change touching credentials, connections, command gating, or responses.
---

# Constraints

## Security
- **MUST** keep all credentials out of the registry: passwords only via env `SSH_PASSWORD_<ALIAS>` (uppercase), keys read from `keyPath` at connect time. *Rationale:* the registry is a shared store; storing secrets would leak them via `listServers`.
- **MUST** store the registry file with mode `0o600` inside a `0o700` directory, written atomically (tmp + rename). *Rationale:* prevents other users reading host configs.
- **MUST** run `CommandChecker.check()` unconditionally on every command execution and keep semantics fail-closed (empty/missing whitelist blocks all). *Rationale:* any skip or open-fail default enables remote-write bypass.
- **MUST** catch every shell-evasion path (substitution, loops, subshells, braces, pipes, process substitution, wrapper peeling) through `check()` recursion. *Rationale:* evasion detection is the core of the safety model.
- **MUST** verify a connection with a round-trip sentinel before marking it `connected`. *Rationale:* rejects half-open/failed channels that would misreport command output.

## Consistency
- **MUST** return every tool result via the `successResponse` / `errorResponse` envelope (`{success:true,data}` or `{success:false,error,code?}`). *Rationale:* agents depend on a single uniform contract.
- **MUST** standardize failures through `AppError` + the `ErrorCode` union. *Rationale:* structured error identification across all tools.
- **MUST** gate every tool behind `requireInstruction()`. *Rationale:* ensures agent instructions are acknowledged before any operation.

## Compatibility & structure
- **MUST** remain a stdio MCP subprocess (no network listener); teardown via SIGTERM/SIGINT → `pool.closeAll()`. *Rationale:* consumed by OpenCode as a child process.
- **MUST** enforce exactly one session per host. *Rationale:* avoids duplicate connections and credential contention.
- **MUST NOT** add domain logic to `index.ts`; keep it wiring-only and add new behavior in dedicated modules (see `conventions.md`).
