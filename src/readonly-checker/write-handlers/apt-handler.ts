import { APT_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function aptHasWriteArg(cmd: string): boolean {
  const match = cmd.toLowerCase().match(/\bapt\b/);
  if (!match) return false;
  const idx = match.index!;
  let rest = cmd.substring(idx + 3).trimStart();
  rest = skipShortFlags(rest);
  const subCmd = getFirstToken(rest);
  if (!subCmd) return false;
  // Whitelist: sadece APT_READ_ONLY izinli
  return !APT_READ_ONLY.has(subCmd);
}
