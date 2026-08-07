import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConnectionPool } from "../pool.js";
import { checker } from "../readonly-checker.js";
import { isReadonlyMode } from "../readonly-guard.js";
import { successResponse, errorResponse, formatError } from "../response.js";

export function registerCommandTool(server: McpServer, pool: ConnectionPool): void {
  server.registerTool(
    "command_execute",
    {
      title: "Execute Command",
      description: "Execute a command on an open SSH session. Can be called multiple times on the same session.",
      inputSchema: {
        sessionId: z.string().describe("Session ID from connection_open"),
        command: z.string().describe("Shell command to execute"),
        timeout: z.number().optional().default(60000).describe("Timeout in milliseconds (default: 60000)"),
      },
    },
    async (args: { sessionId: string; command: string; timeout?: number }) => {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.sessionId)) {
        return errorResponse("Invalid sessionId format");
      }
      if (isReadonlyMode()) {
        const result = checker.check(args.command);
        if (!result.allowed) {
          const parts: string[] = [`Write operation detected: ${result.reason}`];
          if (result.checkLayer) parts.push(`[check_layer=${result.checkLayer}]`);
          if (result.resolvedCommand) parts.push(`[resolved_command=${result.resolvedCommand}]`);
          if (result.originalCommand) parts.push(`[original_command=${result.originalCommand}]`);
          if (result.handlerName) parts.push(`[handler=${result.handlerName}]`);
          if (result.blockedCommand) parts.push(`[blocked_command=${result.blockedCommand}]`);
          if (result.matchedRule) parts.push(`[matched_rule=${result.matchedRule}]`);
          if (result.matchedText) parts.push(`[matched_text=${result.matchedText}]`);
          if (result.segmentIndex !== undefined) parts.push(`[segment=${result.segmentIndex}]`);
          if (result.pipeSegments) parts.push(`[pipe_segments=[${result.pipeSegments.join(', ')}]]`);
          return errorResponse(parts.join(' '));
        }
      }
      try {
        const result = await pool.executeCommand(args.sessionId, args.command, args.timeout);
        return successResponse(result);
      } catch (err: unknown) {
        const { message } = formatError(err);
        return errorResponse(message);
      }
    }
  );
}
