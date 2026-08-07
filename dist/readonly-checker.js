"use strict";
/**
 * Read-only command checker for MCP SSH server.
 *
 * Architecture: Singleton + Direct Dispatch + Early Exit
 * - Whitelist loaded once at construction (O(1) Set.has lookup)
 * - Command routing via Map (O(1) direct dispatch, no strategy chain iteration)
 * - Compiled regex reused across all checks
 * - Early exit on whitelist miss (no further processing)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checker = exports.CommandChecker = void 0;
var command_checker_js_1 = require("./readonly-checker/command-checker.js");
Object.defineProperty(exports, "CommandChecker", { enumerable: true, get: function () { return command_checker_js_1.CommandChecker; } });
Object.defineProperty(exports, "checker", { enumerable: true, get: function () { return command_checker_js_1.checker; } });
//# sourceMappingURL=readonly-checker.js.map