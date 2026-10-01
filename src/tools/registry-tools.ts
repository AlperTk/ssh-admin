import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addServer, listServers, getServer, updateServer, deleteServer } from "../registry.js";
import { ConnectionPool } from "../pool.js";
import { successResponse, handleToolCall } from "../response.js";
import { requireWrite } from "../readonly-guard.js";
import { requireInstruction } from "../instruction-guard.js";

export function registerRegistryTools(server: McpServer, pool: ConnectionPool): void {
  server.registerTool(
    "registry_add_server",
    {
      title: "Add Server",
      description: "Add a new SSH server to the registry",
      inputSchema: {
        alias: z.string()
          .min(1, "Alias cannot be empty")
          .max(64, "Alias must be 64 characters or less")
          .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, "Alias must start with alphanumeric and contain only letters, numbers, dots, hyphens, or underscores")
          .describe("Unique alias for this server (e.g., 'prod-web')"),
        host: z.string().describe("Hostname or IP address"),
        port: z.number().default(22).describe("SSH port (default: 22)"),
        username: z.string().describe("SSH username"),
        authMethod: z.enum(["key", "password"]).describe("Authentication method"),
        keyPath: z.string().optional().describe("Path to SSH private key file (for key auth)"),
      },
    },
    (args: { alias: string; host: string; port: number; username: string; authMethod: "key" | "password"; keyPath?: string }) =>
      handleToolCall(() => {
        const blocked = requireInstruction();
        if (blocked) return blocked;
        const writeBlocked = requireWrite();
        if (writeBlocked) return writeBlocked;
        const result = addServer(args);
        return successResponse(result);
      })()
  );

  server.tool(
    "registry_list_servers",
    "List all registered SSH servers (credentials hidden)",
    () =>
      handleToolCall(() => {
        const blocked = requireInstruction();
        if (blocked) return blocked;
        return successResponse(listServers());
      })()
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
    (args: { alias: string }) =>
      handleToolCall(() => {
        const blocked = requireInstruction();
        if (blocked) return blocked;
        const host = getServer(args.alias);
        return successResponse(host);
      })()
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
    (args: { alias: string; username?: string; authMethod?: "key" | "password"; keyPath?: string }) =>
      handleToolCall(() => {
        const blocked = requireInstruction();
        if (blocked) return blocked;
        const writeBlocked = requireWrite();
        if (writeBlocked) return writeBlocked;
        const updates: Partial<{ username: string; authMethod: "key" | "password"; keyPath: string }> = {};
        if (args.username !== undefined) updates.username = args.username;
        if (args.authMethod !== undefined) updates.authMethod = args.authMethod;
        if (args.keyPath !== undefined) updates.keyPath = args.keyPath;
        const result = updateServer(args.alias, updates);
        return successResponse(result);
      })()
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
    (args: { alias: string }) =>
      handleToolCall(() => {
        const blocked = requireInstruction();
        if (blocked) return blocked;
        const writeBlocked = requireWrite();
        if (writeBlocked) return writeBlocked;
        deleteServer(args.alias);
        return successResponse({ message: `Server '${args.alias}' deleted` });
      })()
  );
}
