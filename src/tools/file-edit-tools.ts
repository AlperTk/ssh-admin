import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConnectionPool } from "../pool.js";
import { successResponse, errorResponse, handleToolCall } from "../response.js";
import { requireInstruction } from "../instruction-guard.js";
import { auditChangelog } from "../log-changelog.js";
import { buildFileEditCommand, describeFileEdit, parseFileEditOutput, type FileEditArgs } from "../file-edit.js";
import { isValidSessionId } from "../session.js";
import { DEFAULT_COMMAND_TIMEOUT_MS } from "../constants.js";

interface FileEditInput {
  sessionId: string;
  path: string;
  mode?: string;
  find?: string;
  replace?: string;
  all?: boolean;
  startLine?: number;
  endLine?: number;
  dryRun?: boolean;
  timeout?: number;
}

export function registerFileEditTool(server: McpServer, pool: ConnectionPool): void {
  server.registerTool(
    "file_edit",
    {
      title: "Edit File",
      description: "Applies a targeted edit to an existing file; makes a backup. dryRun previews the diff.",
      inputSchema: {
        sessionId: z.string().describe("Session ID from connection_open"),
        path: z.string().describe("Absolute path of the remote file"),
        mode: z.enum(["replace", "range"]).describe("'replace' (exact text swap) or 'range' (line span)"),
        find: z.string().optional().describe("mode=replace: exact single-line text; must match once unless all is set."),
        replace: z.string().describe("Replacement text; empty string deletes the match or lines."),
        all: z.boolean().optional().describe("mode=replace: replace all matches (default false: exactly one required)"),
        startLine: z.number().int().optional().describe("mode=range: first line (1-based, inclusive)"),
        endLine: z.number().int().optional().describe("mode=range: last line (inclusive, >= startLine)"),
        dryRun: z.boolean().optional().describe("Preview as diff without writing (default false)"),
        timeout: z.number().optional().describe(`Timeout in ms (default: ${DEFAULT_COMMAND_TIMEOUT_MS})`),
      },
    },
    (args: FileEditInput) =>
      handleToolCall(async () => {
        const blocked = requireInstruction();
        if (blocked) return blocked;
        if (!isValidSessionId(args.sessionId)) {
          return errorResponse("Invalid sessionId format; expected '<alias>-<8 hex>' from connection_open.", "INVALID_INPUT");
        }

        const validationError = validateArgs(args);
        if (validationError) return errorResponse(validationError);

        const editArgs: FileEditArgs = {
          path: args.path,
          mode: args.mode as "replace" | "range",
          find: args.find,
          all: args.all,
          startLine: args.startLine,
          endLine: args.endLine,
          replace: args.replace ?? "",
          dryRun: args.dryRun,
        };

        const command = buildFileEditCommand(editArgs);

        const result = await pool.executeCommand(args.sessionId, command, args.timeout);
        await auditChangelog(pool, args.sessionId, describeFileEdit(editArgs));
        const parsed = parseFileEditOutput(result.stdout);
        if (parsed.error) {
          return errorResponse(parsed.error);
        }
        return successResponse({
          changed: !args.dryRun,
          dryRun: !!args.dryRun,
          count: parsed.count,
          backup: parsed.backup,
          diff: parsed.diff,
        });
      })()
  );
}

function validateArgs(args: FileEditInput): string | null {
  if (!args.path || args.path.length === 0) {
    return "'path' is required and must be non-empty.";
  }
  if (args.mode === "replace") {
    if (!args.find || args.find.length === 0) {
      return "'find' is required for mode='replace' and must be non-empty.";
    }
    if (args.find.includes("\n")) {
      return "'find' must be a single line. For multi-line blocks use mode='range' with startLine/endLine.";
    }
  } else if (args.mode === "range") {
    if (typeof args.startLine !== "number" || typeof args.endLine !== "number") {
      return "'startLine' and 'endLine' are required for mode='range'.";
    }
    if (args.startLine < 1 || args.endLine < 1) {
      return "'startLine' and 'endLine' must be >= 1.";
    }
    if (args.endLine < args.startLine) {
      return "'endLine' must be >= 'startLine'.";
    }
  } else {
    return "Invalid or missing 'mode'. Use 'replace' or 'range'.";
  }
  return null;
}
