import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as fs from "fs/promises";
import * as path from "path";

const BUNDLE_DIR = path.dirname(process.argv[1] || ".");
const INSTRUCTION_PATH = path.resolve(BUNDLE_DIR, "instruction.md");

export function registerInstructionTool(server: McpServer): void {
  server.registerTool(
    "instruction",
    {
      title: "Instruction",
      description: "Important instruction — this tool must be called first. Returns the system prompt / agent instructions",
      inputSchema: {},
    },
    async () => {
      const content = await fs.readFile(INSTRUCTION_PATH, "utf-8");
      return {
        content: [{ type: "text", text: content }],
      };
    }
  );
}
