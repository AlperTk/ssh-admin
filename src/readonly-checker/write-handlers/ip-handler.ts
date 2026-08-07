import { IP_READ_ONLY, IP_READ_ONLY_SUBCOMMANDS } from '../../data/readonly-rules.js';

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

export function ipHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('ip');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 2).trimStart();
  rest = skipFlags(rest);
  const subCmd = getFirstToken(rest);
  if (!subCmd) return false;
  const subCmdLower = subCmd.toLowerCase();

  // ip {addr,link,route,...} {show,list} → okuma
  if (IP_READ_ONLY.has(subCmdLower)) {
    let nsRest = skipFlags(rest.substring(subCmd.length).trimStart());
    const action = getFirstToken(nsRest);
    // Subcommand mapping varsa ve action whitelist'te → okuma
    const allowedActions = IP_READ_ONLY_SUBCOMMANDS.get(subCmdLower);
    if (allowedActions && action && allowedActions.includes(action)) return false;
    // Subcommand mapping yoksa → okuma (monitor, check, session gibi)
    if (!allowedActions) return false;
    // Action whitelist'te yoksa → yazma
    return true;
  }

  // Whitelist: READ_ONLY listesinde yoksa → yazma
  return true;
}
