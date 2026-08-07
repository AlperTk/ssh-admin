"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const registry_js_1 = require("./registry.js");
const pool_js_1 = require("./pool.js");
const readonly_checker_js_1 = require("./readonly-checker.js");
const response_js_1 = require("./response.js");
const readonly_guard_js_1 = require("./readonly-guard.js");
const checker = new readonly_checker_js_1.CommandChecker();
if ((0, readonly_guard_js_1.isReadonlyMode)()) {
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
server.registerTool("registry_add_server", {
    title: "Add Server",
    description: "Add a new SSH server to the registry",
    inputSchema: {
        alias: zod_1.z.string().describe("Unique alias for this server (e.g., 'prod-web')"),
        host: zod_1.z.string().describe("Hostname or IP address"),
        port: zod_1.z.number().default(22).describe("SSH port (default: 22)"),
        username: zod_1.z.string().describe("SSH username"),
        authMethod: zod_1.z.enum(["key", "password"]).describe("Authentication method"),
        keyPath: zod_1.z.string().optional().describe("Path to SSH private key file (for key auth)"),
    },
}, async (args) => {
    const blocked = (0, readonly_guard_js_1.requireWrite)();
    if (blocked)
        return blocked;
    try {
        const result = (0, registry_js_1.addServer)(args);
        return (0, response_js_1.successResponse)(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return (0, response_js_1.errorResponse)(message);
    }
});
server.tool("registry_list_servers", "List all registered SSH servers (credentials hidden)", async () => {
    const hosts = (0, registry_js_1.listServers)();
    return {
        content: [{ type: "text", text: JSON.stringify({ servers: hosts }, null, 2) }],
    };
});
server.registerTool("registry_get_server", {
    title: "Get Server",
    description: "Get details of a specific registered server",
    inputSchema: {
        alias: zod_1.z.string().describe("Server alias"),
    },
}, async (args) => {
    try {
        const host = (0, registry_js_1.getServer)(args.alias);
        return (0, response_js_1.successResponse)(host);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return (0, response_js_1.errorResponse)(message);
    }
});
server.registerTool("registry_update_server", {
    title: "Update Server",
    description: "Update a registered server's properties (cannot change host/port)",
    inputSchema: {
        alias: zod_1.z.string().describe("Server alias to update"),
        username: zod_1.z.string().optional().describe("New username"),
        authMethod: zod_1.z.enum(["key", "password"]).optional().describe("New auth method"),
        keyPath: zod_1.z.string().optional().describe("New key path"),
    },
}, async (args) => {
    const blocked = (0, readonly_guard_js_1.requireWrite)();
    if (blocked)
        return blocked;
    try {
        const updates = {};
        if (args.username !== undefined)
            updates.username = args.username;
        if (args.authMethod !== undefined)
            updates.authMethod = args.authMethod;
        if (args.keyPath !== undefined)
            updates.keyPath = args.keyPath;
        const result = (0, registry_js_1.updateServer)(args.alias, updates);
        return (0, response_js_1.successResponse)(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return (0, response_js_1.errorResponse)(message);
    }
});
server.registerTool("registry_delete_server", {
    title: "Delete Server",
    description: "Remove a server from the registry",
    inputSchema: {
        alias: zod_1.z.string().describe("Server alias to delete"),
    },
}, async (args) => {
    const blocked = (0, readonly_guard_js_1.requireWrite)();
    if (blocked)
        return blocked;
    try {
        (0, registry_js_1.deleteServer)(args.alias);
        return (0, response_js_1.successResponse)({ message: `Server '${args.alias}' deleted` });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return (0, response_js_1.errorResponse)(message);
    }
});
// ── Connection Tools ────────────────────────────────────────────
server.registerTool("connection_open", {
    title: "Open Connection",
    description: "Open an SSH connection to a registered server. Returns a sessionId for subsequent commands.",
    inputSchema: {
        alias: zod_1.z.string().describe("Server alias from registry"),
        timeout: zod_1.z.number().optional().describe("Connection timeout in milliseconds (default: 5000)"),
    },
}, async (args) => {
    try {
        const result = await pool_js_1.pool.open(args.alias, args.timeout);
        return (0, response_js_1.successResponse)(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return (0, response_js_1.errorResponse)(message);
    }
});
server.registerTool("connection_close", {
    title: "Close Session",
    description: "Close an open SSH session",
    inputSchema: {
        sessionId: zod_1.z.string().describe("Session ID to close"),
    },
}, async (args) => {
    const result = pool_js_1.pool.close(args.sessionId);
    if (!result.success) {
        return (0, response_js_1.errorResponse)(result.message);
    }
    return (0, response_js_1.successResponse)(result);
});
server.tool("connection_list", "List all active SSH sessions", async () => {
    const sessions = pool_js_1.pool.list();
    return {
        content: [{ type: "text", text: JSON.stringify({ sessions, count: sessions.length }, null, 2) }],
    };
});
// ── Command Tool ────────────────────────────────────────────────
server.registerTool("command_execute", {
    title: "Execute Command",
    description: "Execute a command on an open SSH session. Can be called multiple times on the same session.",
    inputSchema: {
        sessionId: zod_1.z.string().describe("Session ID from connection_open"),
        command: zod_1.z.string().describe("Shell command to execute"),
        timeout: zod_1.z.number().optional().default(60000).describe("Timeout in milliseconds (default: 60000)"),
    },
}, async (args) => {
    if ((0, readonly_guard_js_1.isReadonlyMode)()) {
        const result = checker.check(args.command);
        if (!result.allowed) {
            const parts = [`Write operation detected: ${result.reason}`];
            if (result.blockedCommand)
                parts.push(`[blocked_command=${result.blockedCommand}]`);
            if (result.matchedRule)
                parts.push(`[matched_rule=${result.matchedRule}]`);
            if (result.matchedText)
                parts.push(`[matched_text=${result.matchedText}]`);
            if (result.segmentIndex !== undefined)
                parts.push(`[segment=${result.segmentIndex}]`);
            return (0, response_js_1.errorResponse)(parts.join(' '));
        }
    }
    try {
        const result = await pool_js_1.pool.executeCommand(args.sessionId, args.command, args.timeout ?? 60000);
        return (0, response_js_1.successResponse)(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return (0, response_js_1.errorResponse)(message);
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