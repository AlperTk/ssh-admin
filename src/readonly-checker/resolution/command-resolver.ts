import { getFirstToken as baseGetFirstToken, skipShortFlags as baseSkipShortFlags } from '../write-handlers/base-handler.js';

export const getFirstToken = baseGetFirstToken;
export const skipShortFlags = baseSkipShortFlags;

/** Komutu çöz: sudo/su/ssh peel-through */
export function resolveCommand(cmd: string): string {
  const firstToken = baseGetFirstToken(cmd);

  if (firstToken === 'sudo') {
    let rest = cmd.substring(firstToken.length).trimStart();
    while (rest.startsWith('-') && !rest.match(/^[a-zA-Z]/)) {
      const flagEnd = rest.search(/\s+/);
      if (flagEnd === -1) break;
      const afterFlag = rest.substring(flagEnd).trimStart();
      if (afterFlag.startsWith('-')) {
        const nextFlagEnd = afterFlag.search(/\s+/);
        if (nextFlagEnd === -1) break;
        rest = afterFlag.substring(nextFlagEnd).trimStart();
      } else {
        rest = afterFlag;
        break;
      }
    }
    return resolveCommand(rest);
  }

  if (firstToken === 'su') {
    const rest = cmd.substring(firstToken.length).trimStart();
    const cMatch = rest.match(/-c\s+['"]?(.+?)['"]?$/);
    if (cMatch) return resolveCommand(cMatch[1]);
    return firstToken;
  }

  if (firstToken === 'ssh') {
    const rest = cmd.substring(firstToken.length).trimStart();
    // Tek tırnak içindeki host'u çıkar
    const quotedMatch = rest.match(/^['"]?([^'"\s]+@[^'"\s]+)['"]?\s*(.*)$/);
    if (quotedMatch) {
      const afterHost = quotedMatch[2].trimStart();
      if (afterHost) return resolveCommand(afterHost);
      return firstToken;
    }
    // Tırnaksız host
    const hostPattern = /[^'"\s]+@[^'"\s]+/;
    const match = rest.match(hostPattern);
    if (match && match.index !== undefined) {
      const afterHost = rest.substring(match.index + match[0].length).trimStart();
      if (afterHost) return resolveCommand(afterHost);
    }
    return firstToken;
  }

  return firstToken;
}
