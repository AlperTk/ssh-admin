import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { addServer, listServers, getServer, updateServer, deleteServer } from "./registry.js";
import { pool } from "./pool.js";
import { CommandChecker } from "./readonly-checker.js";
import { successResponse, errorResponse } from "./response.js";
import { requireWrite, isReadonlyMode } from "./readonly-guard.js";

const checker = new CommandChecker();

if (isReadonlyMode()) {
  console.error("[MCP-SSH] Readonly mode ENABLED - write operations will be blocked");
} else {
  console.error("[MCP-SSH] Readonly mode DISABLED - all operations allowed");
}

// Create MCP server
const server = new McpServer({
  name: "mcp-ssh",
  version: "1.0.0",
});

// ── Registry Tools ──────────────────────────────────────────────

server.registerTool(
  "registry_add_server",
  {
    title: "Add Server",
    description: "Add a new SSH server to the registry",
    inputSchema: {
      alias: z.string().describe("Unique alias for this server (e.g., 'prod-web')"),
      host: z.string().describe("Hostname or IP address"),
      port: z.number().default(22).describe("SSH port (default: 22)"),
      username: z.string().describe("SSH username"),
      authMethod: z.enum(["key", "password"]).describe("Authentication method"),
      keyPath: z.string().optional().describe("Path to SSH private key file (for key auth)"),
    },
  },
  async (args: { alias: string; host: string; port: number; username: string; authMethod: "key" | "password"; keyPath?: string }) => {
    const blocked = requireWrite();
    if (blocked) return blocked;
    try {
      const result = addServer(args);
      return successResponse(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResponse(message);
    }
  }
);

server.tool(
  "registry_list_servers",
  "List all registered SSH servers (credentials hidden)",
  async () => {
    const hosts = listServers();
    return {
      content: [{ type: "text", text: JSON.stringify({ servers: hosts }, null, 2) }],
    };
  }
);

server.registerTool(
  "registry_get_server",
  {
    title: "Get Server",
    description: "Get details of a specific registered server",
    inputSchema: {
      alias: z.string().describe("Server alias"),
    },
  },
  async (args: { alias: string }) => {
    try {
      const host = getServer(args.alias);
      return successResponse(host);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResponse(message);
    }
  }
);

server.registerTool(
  "registry_update_server",
  {
    title: "Update Server",
    description: "Update a registered server's properties (cannot change host/port)",
    inputSchema: {
      alias: z.string().describe("Server alias to update"),
      username: z.string().optional().describe("New username"),
      authMethod: z.enum(["key", "password"]).optional().describe("New auth method"),
      keyPath: z.string().optional().describe("New key path"),
    },
  },
  async (args: { alias: string; username?: string; authMethod?: "key" | "password"; keyPath?: string }) => {
    const blocked = requireWrite();
    if (blocked) return blocked;
    try {
      const updates: Partial<{ username: string; authMethod: "key" | "password"; keyPath: string }> = {};
      if (args.username !== undefined) updates.username = args.username;
      if (args.authMethod !== undefined) updates.authMethod = args.authMethod;
      if (args.keyPath !== undefined) updates.keyPath = args.keyPath;
      const result = updateServer(args.alias, updates);
      return successResponse(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResponse(message);
    }
  }
);

server.registerTool(
  "registry_delete_server",
  {
    title: "Delete Server",
    description: "Remove a server from the registry",
    inputSchema: {
      alias: z.string().describe("Server alias to delete"),
    },
  },
  async (args: { alias: string }) => {
    const blocked = requireWrite();
    if (blocked) return blocked;
    try {
      deleteServer(args.alias);
      return successResponse({ message: `Server '${args.alias}' deleted` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResponse(message);
    }
  }
);

// ── Connection Tools ────────────────────────────────────────────

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
      const message = err instanceof Error ? err.message : String(err);
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

// ── Command Tool ────────────────────────────────────────────────

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
    if (isReadonlyMode()) {
      const result = checker.check(args.command);
      if (!result.allowed) {
        const parts: string[] = [`Write operation detected: ${result.reason}`];
        if (result.blockedCommand) parts.push(`[blocked_command=${result.blockedCommand}]`);
        if (result.matchedRule) parts.push(`[matched_rule=${result.matchedRule}]`);
        if (result.matchedText) parts.push(`[matched_text=${result.matchedText}]`);
        if (result.segmentIndex !== undefined) parts.push(`[segment=${result.segmentIndex}]`);
        return errorResponse(parts.join(' '));
      }
    }
    try {
      const result = await pool.executeCommand(args.sessionId, args.command, args.timeout ?? 60000);
      return successResponse(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResponse(message);
    }
  }
);

// ── Start Server ────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-ssh server running on stdio");
}

main().catch((err) => {
  console.error("Failed to start mcp-ssh server:", err);
  process.exit(1);
});
