import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConnectionPool } from "../pool.js";
import { checker } from "../readonly-checker.js";
import { buildChangelogCommand } from "../log-changelog.js";

import { successResponse, errorResponse, formatError } from "../response.js";
import { requireInstruction } from "../instruction-guard.js";

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
      const blocked = requireInstruction();
      if (blocked) return blocked;
      if (!/^[a-zA-Z0-9_-]+-[0-9a-f]{8}$/i.test(args.sessionId)) {
        return errorResponse("Invalid sessionId format");
      }
      const checkResult = checker.check(args.command);
      if (!checkResult.allowed) {
        const parts: string[] = [`Write operation detected: ${checkResult.reason}`];
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
      try {
        const result = await pool.executeCommand(args.sessionId, args.command, args.timeout);
        return successResponse(result);
      } catch (err: unknown) {
        const { message } = formatError(err);
        return errorResponse(message);
      }
    }
  );

  server.registerTool(
    "command_execute_raw",
    {
      title: "Execute Command Raw",
      description: "Execute commands that modify the system — starting/stopping services, installing packages, modifying configs, creating files, etc. Use for any write or execute operation. For read-only operations (status checks, listing, viewing), use 'command_execute' instead.",
      inputSchema: {
        sessionId: z.string().describe("Session ID from connection_open"),
        command: z.string().describe("Shell command to execute"),
        timeout: z.number().optional().default(60000).describe("Timeout in milliseconds (default: 60000)"),
      },
    },
    async (args: { sessionId: string; command: string; timeout?: number }) => {
      const blocked = requireInstruction();
      if (blocked) return blocked;
      if (!/^[a-zA-Z0-9_-]+-[0-9a-f]{8}$/i.test(args.sessionId)) {
        return errorResponse("Invalid sessionId format");
      }
      const checkResult = checker.check(args.command);
      if (checkResult.allowed) {
        return errorResponse("This is a read-only command. Please use 'command_execute' instead of 'command_execute_raw'.");
      }
      const sessionInfo = pool.getSessionInfo(args.sessionId);
      const changelogCmd = buildChangelogCommand(sessionInfo, args.command);
      if (changelogCmd) {
        pool.executeCommand(args.sessionId, changelogCmd, 5000).catch(() => {});
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
