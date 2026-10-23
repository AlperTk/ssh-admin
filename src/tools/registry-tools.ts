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
      description: "Adds a host to hosts.json. Credentials come from env or key files; never stored.",
      inputSchema: {
        alias: z.string()
          .min(1, "Alias cannot be empty")
          .max(64, "Alias must be 64 characters or less")
          .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, "Alias must start with alphanumeric and contain only letters, numbers, dots, hyphens, or underscores")
          .describe("Unique alias (e.g., 'prod-web')"),
        host: z.string().describe("Hostname or IP address"),
        port: z.number().default(22).describe("SSH port (default: 22)"),
        username: z.string().describe("SSH username"),
        authMethod: z.enum(["key", "password"]).describe("Auth method"),
        keyPath: z.string().optional().describe("Private key file path (key auth)"),
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
    "Lists hosts from hosts.json without credentials.",
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
      description: "Gets one registered server by alias.",
      inputSchema: {
        alias: z.string().describe("Alias"),
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
      description: "Updates username, auth method, or key path; host and port are not changeable here.",
      inputSchema: {
        alias: z.string().describe("Alias to update"),
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
      description: "Removes a server from hosts.json.",
      inputSchema: {
        alias: z.string().describe("Alias to delete"),
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
