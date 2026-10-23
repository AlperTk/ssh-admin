import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConnectionPool } from "../pool.js";
import { checker } from "../readonly-checker.js";
import { auditChangelog } from "../log-changelog.js";

import { successResponse, errorResponse, handleToolCall } from "../response.js";
import { requireInstruction } from "../instruction-guard.js";
import { isValidSessionId } from "../session.js";
import { DEFAULT_COMMAND_TIMEOUT_MS } from "../constants.js";
import { AppError } from "../errors.js";
import type { CheckResult } from "../readonly-checker/command-checker.js";

const INVALID_SESSION_MESSAGE = "Invalid sessionId format; expected '<alias>-<8 hex>' from connection_open.";

function guardUnexpected<T>(fn: () => Promise<T>): () => Promise<T> {
  return async () => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.error("[command-tools] unexpected error:", err);
      throw new AppError("Internal error while processing the command. See server logs.", "INTERNAL_ERROR");
    }
  };
}

function refusalMessage(result: CheckResult): string {
  console.error("[command-tools] command refused:", JSON.stringify(result));
  const reason = result.reason ?? "Command is not read-only";
  const text = result.checkLayer === "whitelist"
    ? `${reason}. If it modifies the system, use 'command_execute_with_approval' (it will be presented to the user for approval).`
    : `Write operation detected: ${reason}. This command is not read-only. To run it, use 'command_execute_with_approval' (it will be presented to the user for approval).`;
  return result.checkLayer ? `${text} [check_layer=${result.checkLayer}]` : text;
}

export function registerCommandTool(server: McpServer, pool: ConnectionPool): void {
  server.registerTool(
    "command_execute_whitelisted",
    {
      title: "Execute Command",
      description: "Runs allowlisted read-only commands on an open SSH session without approval; other commands are refused (use command_execute_with_approval).",
      inputSchema: {
        sessionId: z.string().describe("Session ID from connection_open"),
        command: z.string().describe("Shell command"),
        timeout: z.number().optional().default(DEFAULT_COMMAND_TIMEOUT_MS).describe(`Timeout in ms (default: ${DEFAULT_COMMAND_TIMEOUT_MS})`),
      },
    },
    (args: { sessionId: string; command: string; timeout?: number }) =>
      handleToolCall(guardUnexpected(async () => {
        const blocked = requireInstruction();
        if (blocked) return blocked;
        if (!isValidSessionId(args.sessionId)) {
          return errorResponse(INVALID_SESSION_MESSAGE, "INVALID_INPUT");
        }
        const checkResult = checker.check(args.command);
        if (!checkResult.allowed) {
          return errorResponse(refusalMessage(checkResult), "READONLY_BLOCKED");
        }
        const result = await pool.executeCommand(args.sessionId, args.command, args.timeout);
        return successResponse(result);
      }))()
  );

  server.registerTool(
    "command_execute_with_approval",
    {
      title: "Execute Write Command",
      description: "Runs a command that modifies the system (for use after user/client approval); appends an audit changelog entry. Read-only: use command_execute_whitelisted.",
      inputSchema: {
        sessionId: z.string().describe("Session ID from connection_open"),
        command: z.string().describe("Shell command"),
        timeout: z.number().optional().default(DEFAULT_COMMAND_TIMEOUT_MS).describe(`Timeout in ms (default: ${DEFAULT_COMMAND_TIMEOUT_MS})`),
      },
    },
    (args: { sessionId: string; command: string; timeout?: number }) =>
      handleToolCall(guardUnexpected(async () => {
        const blocked = requireInstruction();
        if (blocked) return blocked;
        if (!isValidSessionId(args.sessionId)) {
          return errorResponse(INVALID_SESSION_MESSAGE, "INVALID_INPUT");
        }
        const checkResult = checker.check(args.command);
        if (checkResult.allowed) {
          return errorResponse("This is a read-only command — it can be executed via 'command_execute_whitelisted' without user approval. Please use 'command_execute_whitelisted' instead.", "INVALID_INPUT");
        }
        const result = await pool.executeCommand(args.sessionId, args.command, args.timeout);
        await auditChangelog(pool, args.sessionId, args.command);
        return successResponse(result);
      }))()
  );
}
