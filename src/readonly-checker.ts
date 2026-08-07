/**
 * Read-only command checker for MCP SSH server.
 *
 * Architecture: Singleton + Direct Dispatch + Early Exit
 * - Whitelist loaded once at construction (O(1) Set.has lookup)
 * - Command routing via Map (O(1) direct dispatch, no strategy chain iteration)
 * - Compiled regex reused across all checks
 * - Early exit on whitelist miss (no further processing)
 */

export { CommandChecker, checker, CheckResult } from './readonly-checker/command-checker.js';
