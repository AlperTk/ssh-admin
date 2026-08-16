import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConnectionPool } from "../pool.js";
import { successResponse, errorResponse, formatError } from "../response.js";
import { requireInstruction } from "../instruction-guard.js";
import { buildChangelogCommand } from "../log-changelog.js";
import { buildFileEditCommand, describeFileEdit, parseFileEditOutput, type FileEditArgs } from "../file-edit.js";

const SESSION_ID_RE = /^[a-zA-Z0-9_-]+-[0-9a-f]{8}$/i;

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
      description:
        "Make a targeted edit to a file on an open SSH session without rewriting the whole file. " +
        "mode='replace' swaps exact text (find -> replace); mode='range' replaces a line span (startLine..endLine) with new content. " +
        "Saves a backup to a temp dir (the path is returned) and gives you a unified diff. Use dryRun=true to preview first.",
      inputSchema: {
        sessionId: z.string().describe("Session ID from connection_open"),
        path: z.string().describe("Absolute path of the file to edit on the remote server"),
        mode: z.enum(["replace", "range"]).describe("'replace' for exact text swap, 'range' for replacing a line span"),
        find: z.string().optional().describe("mode=replace: exact text to find (single line). Must match at least once."),
        replace: z.string().describe("Replacement text. Empty string deletes the match / lines."),
        all: z.boolean().optional().describe("mode=replace: replace all occurrences (default false = exactly one match required)"),
        startLine: z.number().int().optional().describe("mode=range: first line to replace (1-based, inclusive)"),
        endLine: z.number().int().optional().describe("mode=range: last line to replace (inclusive, must be >= startLine)"),
        dryRun: z.boolean().optional().describe("Preview the change as a diff without writing (default false)"),
        timeout: z.number().optional().describe("Timeout in milliseconds (default: 60000)"),
      },
    },
    async (args: FileEditInput) => {
      const blocked = requireInstruction();
      if (blocked) return blocked;
      if (!SESSION_ID_RE.test(args.sessionId)) {
        return errorResponse("Invalid sessionId format");
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

      // Audit trail (same model as command_execute_raw), using a readable summary.
      const sessionInfo = pool.getSessionInfo(args.sessionId);
      const changelogCmd = buildChangelogCommand(sessionInfo, describeFileEdit(editArgs));
      if (changelogCmd) {
        pool.executeCommand(args.sessionId, changelogCmd, 5000).catch(() => {});
      }

      try {
        const result = await pool.executeCommand(args.sessionId, command, args.timeout);
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
      } catch (err: unknown) {
        const { message } = formatError(err);
        return errorResponse(message);
      }
    }
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
