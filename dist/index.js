"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const registry_js_1 = require("./registry.js");
const pool_js_1 = require("./pool.js");
const readonly_checker_js_1 = require("./readonly-checker.js");
const READONLY_MODE = process.env.MCP_SSH_READONLY === "true";
const checker = new readonly_checker_js_1.CommandChecker();
if (READONLY_MODE) {
    console.error("[MCP-SSH] Readonly mode ENABLED - write operations will be blocked");
}
else {
    console.error("[MCP-SSH] Readonly mode DISABLED - all operations allowed");
}
// Create MCP server
const server = new mcp_js_1.McpServer({
    name: "mcp-ssh",
    version: "1.0.0",
});
// ── Registry Tools ──────────────────────────────────────────────
server.tool("registry_add_server", "Add a new SSH server to the registry", {
    alias: zod_1.z.string().describe("Unique alias for this server (e.g., 'prod-web')"),
    host: zod_1.z.string().describe("Hostname or IP address"),
    port: zod_1.z.number().default(22).describe("SSH port (default: 22)"),
    username: zod_1.z.string().describe("SSH username"),
    authMethod: zod_1.z.enum(["key", "password"]).describe("Authentication method"),
    keyPath: zod_1.z.string().optional().describe("Path to SSH private key file (for key auth)"),
}, async ({ alias, host, port, username, authMethod, keyPath }) => {
    if (READONLY_MODE) {
        return {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: "Readonly mode is enabled. Write operations are not allowed." }) }],
            isError: true,
        };
    }
    try {
        const result = (0, registry_js_1.addServer)({ alias, host, port, username, authMethod, keyPath });
        return {
            content: [{ type: "text", text: JSON.stringify({ success: true, server: result }, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }],
            isError: true,
        };
    }
});
server.tool("registry_list_servers", "List all registered SSH servers (credentials hidden)", {}, async () => {
    const hosts = (0, registry_js_1.listServers)();
    return {
        content: [{ type: "text", text: JSON.stringify({ servers: hosts }, null, 2) }],
    };
});
server.tool("registry_get_server", "Get details of a specific registered server", {
    alias: zod_1.z.string().describe("Server alias"),
}, async ({ alias }) => {
    try {
        const host = (0, registry_js_1.getServer)(alias);
        return {
            content: [{ type: "text", text: JSON.stringify({ server: host }, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }],
            isError: true,
        };
    }
});
server.tool("registry_update_server", "Update a registered server's properties (cannot change host/port)", {
    alias: zod_1.z.string().describe("Server alias to update"),
    username: zod_1.z.string().optional().describe("New username"),
    authMethod: zod_1.z.enum(["key", "password"]).optional().describe("New auth method"),
    keyPath: zod_1.z.string().optional().describe("New key path"),
}, async ({ alias, ...updates }) => {
    if (READONLY_MODE) {
        return {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: "Readonly mode is enabled. Write operations are not allowed." }) }],
            isError: true,
        };
    }
    try {
        const result = (0, registry_js_1.updateServer)(alias, updates);
        return {
            content: [{ type: "text", text: JSON.stringify({ success: true, server: result }, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }],
            isError: true,
        };
    }
});
server.tool("registry_delete_server", "Remove a server from the registry", {
    alias: zod_1.z.string().describe("Server alias to delete"),
}, async ({ alias }) => {
    if (READONLY_MODE) {
        return {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: "Readonly mode is enabled. Write operations are not allowed." }) }],
            isError: true,
        };
    }
    try {
        (0, registry_js_1.deleteServer)(alias);
        return {
            content: [{ type: "text", text: JSON.stringify({ success: true, message: `Server '${alias}' deleted` }) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }],
            isError: true,
        };
    }
});
// ── Connection Tools ────────────────────────────────────────────
server.tool("connection_open", "Open an SSH connection to a registered server. Returns a sessionId for subsequent commands.", {
    alias: zod_1.z.string().describe("Server alias from registry"),
    timeout: zod_1.z.number().optional().describe("Connection timeout in milliseconds (default: 5000)"),
}, async ({ alias, timeout }) => {
    try {
        const result = await pool_js_1.pool.open(alias, timeout);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }],
            isError: true,
        };
    }
});
server.tool("connection_close", "Close an open SSH session", {
    sessionId: zod_1.z.string().describe("Session ID to close"),
}, async ({ sessionId }) => {
    const result = pool_js_1.pool.close(sessionId);
    if (!result.success) {
        return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            isError: true,
        };
    }
    return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
});
server.tool("connection_list", "List all active SSH sessions", {}, async () => {
    const sessions = pool_js_1.pool.list();
    return {
        content: [{ type: "text", text: JSON.stringify({ sessions, count: sessions.length }, null, 2) }],
    };
});
// ── Command Tool ────────────────────────────────────────────────
server.tool("command_execute", "Execute a command on an open SSH session. Can be called multiple times on the same session.", {
    sessionId: zod_1.z.string().describe("Session ID from connection_open"),
    command: zod_1.z.string().describe("Shell command to execute"),
    timeout: zod_1.z.number().optional().default(60000).describe("Timeout in milliseconds (default: 60000)"),
}, async ({ sessionId, command, timeout }) => {
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
        const result = await pool_js_1.pool.executeCommand(sessionId, command, timeout);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }],
            isError: true,
        };
    }
});
// ── Start Server ────────────────────────────────────────────────
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("mcp-ssh server running on stdio");
}
main().catch((err) => {
    console.error("Failed to start mcp-ssh server:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map