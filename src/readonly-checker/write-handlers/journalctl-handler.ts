import { JOURNALCTL_WRITE_FLAGS } from '../../data/readonly-rules.js';

function getFirstToken(cmd: string): string {
  let token = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (ch === "'" && !inDoubleQuote) { inSingleQuote = !inSingleQuote; }
    else if (ch === '"' && !inSingleQuote) { inDoubleQuote = !inDoubleQuote; }
    else if (!inSingleQuote && !inDoubleQuote) {
      if (ch === ' ' || ch === '\t' || ch === ';') break;
      token += ch;
    } else { token += ch; }
  }
  return token;
}

export function journalctlHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('journalctl');
  if (idx === -1) return false;
  const rest = cmd.substring(idx + 10).trimStart();
  const tokens = rest.split(/\s+/);
  for (const token of tokens) {
    const flag = token.split('=')[0];
    if (JOURNALCTL_WRITE_FLAGS.has(flag)) return true;
  }
  return false;
}
