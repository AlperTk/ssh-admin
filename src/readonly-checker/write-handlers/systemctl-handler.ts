import { SYSTEMCTL_READ_ONLY } from '../../data/readonly-rules.js';

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

function skipFlags(rest: string): string {
  while (rest.startsWith('-')) {
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx === -1) return '';
    const afterFlag = rest.substring(spaceIdx).trimStart();
    if (afterFlag.startsWith('-')) {
      const nextSpace = afterFlag.indexOf(' ');
      if (nextSpace === -1) break;
      rest = afterFlag.substring(nextSpace).trimStart();
    } else {
      rest = afterFlag;
      break;
    }
  }
  return rest;
}

export function systemctlHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('systemctl');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 9).trimStart();
  rest = skipFlags(rest);
  const subCmd = getFirstToken(rest);
  if (!subCmd) return false;
  return !SYSTEMCTL_READ_ONLY.has(subCmd);
}
