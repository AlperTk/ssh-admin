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

## ~/server-info/ Maintenance

You discover these files by name: on connect you receive a tree view of \`~/server-info/\`. File names are your only index — name each file so you can pick the right one without opening it.

### Knowledge base (knowledge/)
- Name each file after the specific topic or service it documents.
  - Good: \`postgres-pg16.md\`, \`nginx-reverse-proxy.md\`, \`k8s-ingress-rules.md\`, \`backup-cron.md\`
  - Bad: \`notes.md\`, \`info.md\`, \`service1.md\`, \`misc.md\`
- One file per distinct topic/service. Do not merge unrelated topics into a single file.
- Store only server-specific facts you cannot infer. Assume you already know how every tool works.
  - Record concrete values and decisions: volume/mount paths, network type & name, ports, versions, custom architecture rules, non-obvious constraints, and the rationale behind decisions.
  - Never restate general knowledge — what a technology is, standard commands, or anything a competent engineer already knows. For a Dockerized service, do not explain Docker or list \`docker\` commands; just record its volumes, network, ports, and any special rules.
- Use short bullets / key-value pairs, not prose. Every line must be worth the context it costs.
- When the system changes (config, version, path, decision), update the matching file. Prefer updating an existing file over creating a new one; replace stale facts instead of appending contradictions.

### Scripts (scripts/)
Capture recurring multi-step operations as reusable scripts so they run consistently and quickly.
- Create a script only when you repeat the same multi-step operation more than once.
- Name it after what it does, verb-first.
  - Good: \`rotate-logs.sh\`, \`restart-app.sh\`, \`backup-db.sh\`
  - Bad: \`script1.sh\`, \`doit.sh\`, \`temp.sh\`
- Start each script with a one-line comment: what it does and when to run it.
- Keep scripts minimal and idempotent where possible; prefer updating an existing script over adding a near-duplicate.

## Command Execution Guidelines

Before calling \`command_execute\` or \`command_execute_raw\**, always tell the user what you are about to do:

- **Read-only**: "I will read X file", "I will check Y service status" etc.
- **Write**: "I will modify Z file", "I will install W package" etc.

## File Editing Guidelines

Prefer the \`file_edit\` tool over rewriting whole files or hand-crafting sed/awk. It saves a backup to a temp dir (the path is returned) and gives you a unified diff.

- **Single value / small unique text** → \`file_edit\` with \`mode="replace"\` (\`find\` → \`replace\`).
- **Replacing a block of lines** (e.g. 30 lines → 5 lines) → \`file_edit\` with \`mode="range"\` (\`startLine\`, \`endLine\`, new \`replace\`). Do NOT paste the old block into \`find\`.
- **Whole-file rewrite** only when >~50% of the file changes or the change is structural.

Workflow: read the region first (\`command_execute\` → \`sed -n 'X,Yp'\` or \`grep -n\`), then call \`file_edit\` with \`dryRun=true\` to review the diff, then apply with \`dryRun=false\`.
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
