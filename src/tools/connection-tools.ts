import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConnectionPool } from "../pool.js";
import { successResponse, errorResponse, formatError } from "../response.js";

export function registerConnectionTools(server: McpServer, pool: ConnectionPool): void {
  server.registerTool(
    "connection_open",
    {
      title: "Open Connection",
      description: "Open an SSH connection to a registered server. Returns a sessionId for subsequent commands.",
      inputSchema: {
        alias: z.string().describe("Server alias from registry"),
        timeout: z.number().optional().describe("Connection timeout in milliseconds (default: 5000)"),
      },
    },
    async (args: { alias: string; timeout?: number }) => {
      try {
        const result = await pool.open(args.alias, args.timeout);
        return successResponse(result);
      } catch (err: unknown) {
        const { message } = formatError(err);
        return errorResponse(message);
      }
    }
  );

  server.registerTool(
    "connection_close",
    {
      title: "Close Session",
      description: "Close an open SSH session",
      inputSchema: {
        sessionId: z.string().describe("Session ID to close"),
      },
    },
    async (args: { sessionId: string }) => {
      const result = pool.close(args.sessionId);
      if (!result.success) {
        return errorResponse(result.message);
      }
      return successResponse(result);
    }
  );

  server.tool(
    "connection_list",
    "List all active SSH sessions",
    async () => {
      const sessions = pool.list();
      return {
        content: [{ type: "text", text: JSON.stringify({ sessions, count: sessions.length }, null, 2) }],
      };
    }
  );
}
