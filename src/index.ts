import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { addServer, listServers, getServer, updateServer, deleteServer } from "./registry.js";
import { pool } from "./pool.js";
import { CommandChecker } from "./readonly-checker.js";

const READONLY_MODE = process.env.MCP_SSH_READONLY === "true";
const checker = new CommandChecker();

if (READONLY_MODE) {
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

server.tool(
  "registry_add_server",
  "Add a new SSH server to the registry",
  {
    alias: z.string().describe("Unique alias for this server (e.g., 'prod-web')"),
    host: z.string().describe("Hostname or IP address"),
    port: z.number().default(22).describe("SSH port (default: 22)"),
    username: z.string().describe("SSH username"),
    authMethod: z.enum(["key", "password"]).describe("Authentication method"),
    keyPath: z.string().optional().describe("Path to SSH private key file (for key auth)"),
  },
  async ({ alias, host, port, username, authMethod, keyPath }) => {
    if (READONLY_MODE) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: "Readonly mode is enabled. Write operations are not allowed." }) }],
        isError: true,
      };
    }
    try {
      const result = addServer({ alias, host, port, username, authMethod, keyPath });
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, server: result }, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  "registry_list_servers",
  "List all registered SSH servers (credentials hidden)",
  {},
  async () => {
    const hosts = listServers();
    return {
      content: [{ type: "text", text: JSON.stringify({ servers: hosts }, null, 2) }],
    };
  }
);

server.tool(
  "registry_get_server",
  "Get details of a specific registered server",
  {
    alias: z.string().describe("Server alias"),
  },
  async ({ alias }) => {
    try {
      const host = getServer(alias);
      return {
        content: [{ type: "text", text: JSON.stringify({ server: host }, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  "registry_update_server",
  "Update a registered server's properties (cannot change host/port)",
  {
    alias: z.string().describe("Server alias to update"),
    username: z.string().optional().describe("New username"),
    authMethod: z.enum(["key", "password"]).optional().describe("New auth method"),
    keyPath: z.string().optional().describe("New key path"),
  },
  async ({ alias, ...updates }) => {
    if (READONLY_MODE) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: "Readonly mode is enabled. Write operations are not allowed." }) }],
        isError: true,
      };
    }
    try {
      const result = updateServer(alias, updates);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, server: result }, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  "registry_delete_server",
  "Remove a server from the registry",
  {
    alias: z.string().describe("Server alias to delete"),
  },
  async ({ alias }) => {
    if (READONLY_MODE) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: "Readonly mode is enabled. Write operations are not allowed." }) }],
        isError: true,
      };
    }
    try {
      deleteServer(alias);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, message: `Server '${alias}' deleted` }) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }],
        isError: true,
      };
    }
  }
);

// ── Connection Tools ────────────────────────────────────────────

server.tool(
  "connection_open",
  "Open an SSH connection to a registered server. Returns a sessionId for subsequent commands.",
  {
    alias: z.string().describe("Server alias from registry"),
    timeout: z.number().optional().describe("Connection timeout in milliseconds (default: 5000)"),
  },
  async ({ alias, timeout }) => {
    try {
      const result = await pool.open(alias, timeout);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  "connection_close",
  "Close an open SSH session",
  {
    sessionId: z.string().describe("Session ID to close"),
  },
  async ({ sessionId }) => {
    const result = pool.close(sessionId);
    if (!result.success) {
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "connection_list",
  "List all active SSH sessions",
  {},
  async () => {
    const sessions = pool.list();
    return {
      content: [{ type: "text", text: JSON.stringify({ sessions, count: sessions.length }, null, 2) }],
    };
  }
);

// ── Command Tool ────────────────────────────────────────────────

server.tool(
  "command_execute",
  "Execute a command on an open SSH session. Can be called multiple times on the same session.",
  {
    sessionId: z.string().describe("Session ID from connection_open"),
    command: z.string().describe("Shell command to execute"),
    timeout: z.number().optional().default(60000).describe("Timeout in milliseconds (default: 60000)"),
  },
  async ({ sessionId, command, timeout }) => {
    if (READONLY_MODE) {
      const result = checker.check(command);
      if (!result.allowed) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: `Write operation detected: ${result.reason}` }) }],
          isError: true,
        };
      }
    }
    try {
      const result = await pool.executeCommand(sessionId, command, timeout);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }],
        isError: true,
      };
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
