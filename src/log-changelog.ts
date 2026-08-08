export interface SessionInfo {
  alias: string;
  host: string;
  username: string;
}

const MAX_LINES = 500;

function escapeSingleQuote(str: string): string {
  return str.replace(/'/g, "'\\''");
}

export function buildChangelogCommand(sessionInfo: SessionInfo | null, command: string): string {
  if (!sessionInfo) return "";

  const { alias, host, username } = sessionInfo;
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  const safeCommand = escapeSingleQuote(command.replace(/\r?\n/g, " "));

  const rotationCmd = `[ -s ~/server-info/logs/changelog.log ] && [ $(wc -l < ~/server-info/logs/changelog.log) -gt ${MAX_LINES} ] && tail -n ${MAX_LINES} ~/server-info/logs/changelog.log > ~/server-info/logs/changelog.log.tmp && mv ~/server-info/logs/changelog.log.tmp ~/server-info/logs/changelog.log`;

  return [
    "mkdir -p ~/server-info/logs",
    `echo "[${timestamp}] alias=${alias} host=${host} user=${username} cmd='${safeCommand}'" >> ~/server-info/logs/changelog.log`,
    rotationCmd,
  ].join(" && ");
}
