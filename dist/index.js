import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerRegistryTools } from "./tools/registry-tools.js";
import { registerConnectionTools } from "./tools/connection-tools.js";
import { registerCommandTool } from "./tools/command-tools.js";
import { registerInstructionTool } from "./tools/instruction-tools.js";
import { pool } from "./pool.js";
import { isReadonlyMode } from "./readonly-guard.js";
if (isReadonlyMode()) {
    console.error("[MCP-SSH] Readonly mode ENABLED - write operations will be blocked");
}
else {
    console.error("[MCP-SSH] Readonly mode DISABLED - all operations allowed");
}
const server = new McpServer({ name: "ssh-admin", version: "1.0.0" }, {
    instructions: "Bağlandığınızda ilk olarak 'instruction' aracını çağırın. Sistem talimatlarını döndürür.",
});
registerRegistryTools(server, pool);
registerConnectionTools(server, pool);
registerCommandTool(server, pool);
registerInstructionTool(server);
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("ssh-admin server running on stdio");
}
main().catch((err) => {
    console.error("Failed to start ssh-admin server:", err);
    process.exit(1);
});
process.on('SIGTERM', () => {
    console.error('[MCP-SSH] Received SIGTERM, closing sessions...');
    pool.closeAll();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.error('[MCP-SSH] Received SIGINT, closing sessions...');
    pool.closeAll();
    process.exit(0);
});
//# sourceMappingURL=index.js.map