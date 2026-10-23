# Changelog

## 0.2.0 - 2026-10-23

- **License changed from MIT to Apache-2.0**, matching the `LICENSE` file and README.
- **Renamed command tools:**
  - `command_execute_read` → `command_execute_whitelisted` (runs allowlisted read-only commands without approval).
  - `command_execute_write` → `command_execute_with_approval` (for system-modifying commands, after approval).
  - Tool descriptions and refusal messages reference the new names.
- **Error handling:**
  - SSH/stream command failures return a generic `COMMAND_FAILED` message ("Command execution failed (SSH error)") instead of raw error details.
  - Unexpected command-processing failures return `INTERNAL_ERROR` with a generic message; details go to server logs.
- **Packaging:** the npm tarball excludes source maps (`*.map`) and `.ts` artifacts (e.g. `dist/data/readonly-rules.ts`). `dist/data/readonly-whitelist.json` still ships because it is read at runtime.
- **README:** rewritten for accuracy (tool names, license, installation).
