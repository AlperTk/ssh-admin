import { ConnectionPool } from "./pool.js";
import type { SessionInfo } from "./types.js";
import { AUDIT_COMMAND_TIMEOUT_MS } from "./constants.js";

const MAX_LINES = 500;

function escapeSingleQuote(str: string): string {
  return str.replace(/'/g, "'\\''");
}

export function buildChangelogCommand(sessionInfo: SessionInfo | null, command: string): string {
  if (!sessionInfo) return "";

  const { alias, host, username } = sessionInfo;
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  const safeCommand = escapeSingleQuote(command.replace(/\r?\n/g, " "));

  const rotationCmd = `[ -s ~/server-info/changelog.log ] && [ $(wc -l < ~/server-info/changelog.log) -gt ${MAX_LINES} ] && tail -n ${MAX_LINES} ~/server-info/changelog.log > ~/server-info/changelog.log.tmp && mv ~/server-info/changelog.log.tmp ~/server-info/changelog.log`;

  return [
    "mkdir -p ~/server-info/logs",
    `echo "[${timestamp}] alias=${alias} host=${host} user=${username} cmd='${safeCommand}'" >> ~/server-info/changelog.log`,
    rotationCmd,
  ].join(" && ");
}

export async function auditChangelog(
  pool: ConnectionPool,
  sessionId: string,
  description: string,
): Promise<void> {
  try {
    const info = pool.getSessionInfo(sessionId);
    if (!info) return;
    const cmd = buildChangelogCommand(info, description);
    if (cmd) await pool.executeCommand(sessionId, cmd, AUDIT_COMMAND_TIMEOUT_MS);
  } catch (err) {
    console.error("[changelog] audit failed:", err);
  }
}
