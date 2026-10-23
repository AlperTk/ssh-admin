---
name: whitelist
description: How the readonly-checker command whitelist is sourced, loaded, cached, and enforced by CommandChecker (fail-closed behavior, path candidates, gating order).
---
# Readonly command whitelist

## Purpose
- The whitelist is the first read-gate in `CommandChecker`: a command whose effective first token is not in it is denied. Handlers and pattern detection only run after it passes. (`src/readonly-checker/command-checker.ts::CommandChecker/checkPipeSegment`)
- **Core rule:** the goal is that executing a command never makes a persistent change to the system. Read-only use of a command is allowed; any write/persistent-change use is denied.
- A command may be both read and write (e.g. `partprobe`, `ufw`, `sysctl`, `tune2fs`, `awk`). Whitelisting a command means it is a candidate for read use only. The read/write decision is made per argument by its handler and the pattern detector, never by the whitelist alone.
- Gate order: whitelist (command allowed as candidate) → handler (argument-level write detection) → pattern detector (shell-level write patterns). A command is allowed only if all layers pass.

## Sources & path resolution
- Data file name: `readonly-whitelist.json`, expected in a `data/` directory.
- `resolveWhitelistPath` tries two candidates in order, relative to the module's `__dirname`: `<dir>/data/readonly-whitelist.json`, then `<dir>/../data/readonly-whitelist.json`. Returns the first that exists, else `null`. (`src/readonly-checker/data-access.ts::resolveWhitelistPath`)
- No env var or config override for the path was found in the read scope. (`src/readonly-checker/data-access.ts::resolveWhitelistPath`)

## Parsing format
- JSON object with a `commands` array of strings. Non-string entries are silently dropped. Result is a `Set<string>` of bare command names. (`src/readonly-checker/data-access.ts::parseWhitelist`)
- If `commands` is missing or not an array, `parseWhitelist` throws. (`src/readonly-checker/data-access.ts::parseWhitelist`)

## Loading & failure behavior
- `readWhitelist` resolves the path, then reads UTF-8 and parses. (`src/readonly-checker/data-access.ts::readWhitelist`)
- File not found → `console.warn` and an empty set (fail-closed: every command is then denied as "not in whitelist").
- Read/parse error → `console.error` with the path and message, and an empty set.
- `loadWhitelist` memoizes the result in module-level `cachedWhitelist`. An empty set is also cached (non-null), so a failed load is not retried for the life of the process. (`src/readonly-checker/data-access.ts::loadWhitelist`, `cachedWhitelist`)

## Usage in CommandChecker
- Constructor calls `loadWhitelist()` once per instance, then `buildHandlers()`, then creates `WritePatternDetector`. (`src/readonly-checker/command-checker.ts::CommandChecker/constructor`)
- Per pipe segment, order is: process-substitution check → `resolveCommand` + `getFirstToken` → deny-list (`.`) → whitelist membership on the resolved first token → write-handler dispatch (`buildHandlers` map, keyed by command name) → write-pattern detector. (`src/readonly-checker/command-checker.ts::CommandChecker/checkPipeSegment`)
- Whitelist denial is built via `denyResult` with reason "Command '<cmd>' is not in the read-only whitelist". Handler denials set `checkLayer: 'handler'`, pattern denials `checkLayer: 'pattern'`. (`src/readonly-checker/command-checker.ts::CommandChecker/checkPipeSegment`; `denyResult` body not read, so its `checkLayer` value for whitelist denials is unverified)
- Whitelist lookup is an O(1) `Set.has`. (`src/readonly-checker/command-checker.ts::CommandChecker/checkPipeSegment`)
- Whitelist is a private readonly instance field; there is no public method to mutate it. (`src/readonly-checker/command-checker.ts::CommandChecker`)
- `check()` recurses through substitutions, loops, subshells, and braces before segment checks, so whitelist checks apply to nested commands too. (`src/readonly-checker/command-checker.ts::CommandChecker/check`, `checkSegment`)

## Invariants & gotchas
- Fail-closed: missing or invalid file ⇒ empty whitelist ⇒ all commands denied. Consistent with constraints (fail-closed rule).
- The `.` deny-list is checked before the whitelist; a whitelisted name cannot bypass it.
- A whitelist hit does not allow a command: handler and pattern checks still run afterward.
- Cache is per process; editing `readonly-whitelist.json` requires a restart to take effect.
- Whitelist entries are compared to the resolved first token as-is (bare names). Whether `getFirstToken` normalizes paths such as `/usr/bin/x` was NOT verified (outside read scope).
- Path candidates depend on compiled output layout (`__dirname`); the exact `data/` location in the built tree was not verified.
- Fail-closed by design: any write detection error or unknown handler result must lead to denial, never to allowance.
- **Open (unverified):** whether a whitelisted command with no registered handler is allowed with no argument checks. Until verified, treat such commands as needing argument review.
- Handler design is fail-closed on ambiguity (e.g. unknown flag form → deny). Read-only forms that a handler cannot distinguish from writes may be denied (over-blocking is accepted; under-blocking is not).
- `docker exec` pattern checks (`docker-exec-checker`) are not part of the registered handler map; their effect on the live pipeline depends on that registration, which is not yet decided.
