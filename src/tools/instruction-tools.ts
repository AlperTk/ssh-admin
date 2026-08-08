import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { setInstructionCalled } from "../instruction-guard.js";

const INSTRUCTION_CONTENT = `# Agent Instructions

This MCP server is used to manage SSH servers.

## ~/server-info/ Structure

Each server has persistent information stored in its \`~/server-info/\` directory. These files are updated and read by the AI.

### Files

- **services.md** — Installed services and their status
- **packages.md** — Installed critical packages
- **rules.md** — Server constraints and rules
- **decisions.md** — Decisions made and their rationale
- **architecture.md** — Architecture notes and configuration details
- **changelog.log** — Commands executed via command_execute_raw (auto-append)

### Directories

- **knowledge/** — Knowledge files (.md) created and maintained by the AI
  - Each .md file represents a topic or knowledge domain
  - AI adds or updates files as it learns new server information
- **scripts/** — Reusable scripts for frequently performed operations
  - Store automation scripts here to speed up common tasks
  - AI creates and maintains scripts based on recurring operational patterns

### Usage Rules

- **Read operations:** Use \`command_execute\` (protected by whitelist + write pattern detection)
- **Permanent changes:** Use \`command_execute_raw\` (unfiltered + user approval required)
- Files are updated by AI when system changes occur
- AI reads these files to get server information when needed
`;

export function registerInstructionTool(server: McpServer): void {
  server.registerTool(
    "instruction",
    {
      title: "Instruction",
      description: "Important instruction — this tool must be called first. Returns the system prompt / agent instructions",
      inputSchema: {},
    },
    async () => {
      setInstructionCalled();
      return {
        content: [{ type: "text", text: INSTRUCTION_CONTENT }],
      };
    }
  );
}
