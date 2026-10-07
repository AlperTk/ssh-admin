import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConnectionPool } from "../pool.js";
import { checker } from "../readonly-checker.js";
import { auditChangelog } from "../log-changelog.js";

import { successResponse, errorResponse, handleToolCall } from "../response.js";
import { requireInstruction } from "../instruction-guard.js";
import { isValidSessionId } from "../session.js";
import { DEFAULT_COMMAND_TIMEOUT_MS } from "../constants.js";

export function registerCommandTool(server: McpServer, pool: ConnectionPool): void {
  server.registerTool(
    "command_execute_read",
    {
      title: "Execute Command",
      description: "Execute a read-only command on an open SSH session (status checks, listing, viewing). Read-only commands pass the whitelist and run automatically, without user approval. For any write or system-modifying operation, use 'command_execute_write' instead. Returns stdout, stderr, exitCode, and duration.",
      inputSchema: {
        sessionId: z.string().describe("Session ID from connection_open"),
        command: z.string().describe("Shell command to execute"),
        timeout: z.number().optional().default(DEFAULT_COMMAND_TIMEOUT_MS).describe(`Timeout in milliseconds (default: ${DEFAULT_COMMAND_TIMEOUT_MS})`),
      },
    },
    (args: { sessionId: string; command: string; timeout?: number }) =>
      handleToolCall(async () => {
        const blocked = requireInstruction();
        if (blocked) return blocked;
        if (!isValidSessionId(args.sessionId)) {
          return errorResponse("Invalid sessionId format");
        }
        const checkResult = checker.check(args.command);
        if (!checkResult.allowed) {
          const parts: string[] = [`Write operation detected: ${checkResult.reason}. This command is not read-only. To run it, use 'command_execute_write' (it will be presented to the user for approval).`];
          if (checkResult.checkLayer) parts.push(`[check_layer=${checkResult.checkLayer}]`);
          if (checkResult.resolvedCommand) parts.push(`[resolved_command=${checkResult.resolvedCommand}]`);
          if (checkResult.originalCommand) parts.push(`[original_command=${checkResult.originalCommand}]`);
          if (checkResult.handlerName) parts.push(`[handler=${checkResult.handlerName}]`);
          if (checkResult.blockedCommand) parts.push(`[blocked_command=${checkResult.blockedCommand}]`);
          if (checkResult.matchedRule) parts.push(`[matched_rule=${checkResult.matchedRule}]`);
          if (checkResult.matchedText) parts.push(`[matched_text=${checkResult.matchedText}]`);
          if (checkResult.segmentIndex !== undefined) parts.push(`[segment=${checkResult.segmentIndex}]`);
          if (checkResult.pipeSegments) parts.push(`[pipe_segments=[${checkResult.pipeSegments.join(', ')}]]`);
          return errorResponse(parts.join(' '));
        }
        const result = await pool.executeCommand(args.sessionId, args.command, args.timeout);
        return successResponse(result);
      })()
  );

  server.registerTool(
    "command_execute_write",
    {
      title: "Execute Write Command",
      description: "Execute a command that modifies the system — starting/stopping services, installing packages, modifying configs, creating files, etc. This command is presented to the user for approval and runs only after approval. For read-only operations (status checks, listing, viewing), use 'command_execute_read' instead.",
      inputSchema: {
        sessionId: z.string().describe("Session ID from connection_open"),
        command: z.string().describe("Shell command to execute"),
        timeout: z.number().optional().default(DEFAULT_COMMAND_TIMEOUT_MS).describe(`Timeout in milliseconds (default: ${DEFAULT_COMMAND_TIMEOUT_MS})`),
      },
    },
    (args: { sessionId: string; command: string; timeout?: number }) =>
      handleToolCall(async () => {
        const blocked = requireInstruction();
        if (blocked) return blocked;
        if (!isValidSessionId(args.sessionId)) {
          return errorResponse("Invalid sessionId format");
        }
        const checkResult = checker.check(args.command);
        if (checkResult.allowed) {
          return errorResponse("This is a read-only command — it can be executed via 'command_execute_read' without user approval. Please use 'command_execute_read' instead.");
        }
        const result = await pool.executeCommand(args.sessionId, args.command, args.timeout);
        await auditChangelog(pool, args.sessionId, args.command);
        return successResponse(result);
      })()
  );
}
