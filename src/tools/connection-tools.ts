import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConnectionPool } from "../pool.js";
import { successResponse, errorResponse, handleToolCall } from "../response.js";
import { requireInstruction } from "../instruction-guard.js";
import { buildDiscoveryCommand } from "../server-info.js";
import { DEFAULT_CONNECTION_TIMEOUT_MS } from "../constants.js";

export function registerConnectionTools(server: McpServer, pool: ConnectionPool): void {
  server.registerTool(
    "connection_open",
    {
      title: "Open Connection",
      description: "Opens or reuses the live session per host; returns its sessionId (verified against the registry).",
      inputSchema: {
        alias: z.string().describe("Alias from registry"),
        timeout: z.number().optional().describe(`Timeout in ms (default: ${DEFAULT_CONNECTION_TIMEOUT_MS})`),
      },
    },
    (args: { alias: string; timeout?: number }) =>
      handleToolCall(async () => {
        const blocked = requireInstruction();
        if (blocked) return blocked;
        const result = await pool.open(args.alias, args.timeout);
        if (result.status === "connected" || result.status === "already_connected") {
          const dirResult = await pool.executeCommand(result.sessionId, buildDiscoveryCommand(), 10000);
          return successResponse({ ...result, serverInfoStructure: dirResult.stdout });
        }
        return successResponse(result);
      })()
  );

  server.registerTool(
    "connection_close",
    {
      title: "Close Session",
      description: "Closes an open SSH session by sessionId.",
      inputSchema: {
        sessionId: z.string().describe("Session ID to close"),
      },
    },
    (args: { sessionId: string }) =>
      handleToolCall(() => {
        const blocked = requireInstruction();
        if (blocked) return blocked;
        const result = pool.close(args.sessionId);
        if (!result.success) {
          return errorResponse(result.message, "NOT_FOUND");
        }
        return successResponse(result);
      })()
  );

  server.tool(
    "connection_list",
    "Lists live SSH sessions.",
    () =>
      handleToolCall(() => {
        const blocked = requireInstruction();
        if (blocked) return blocked;
        return successResponse(pool.list());
      })()
  );
}
