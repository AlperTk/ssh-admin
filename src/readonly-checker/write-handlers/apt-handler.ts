import { APT_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function aptHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('apt');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 3).trimStart();
  rest = skipShortFlags(rest);
  const subCmd = getFirstToken(rest);
  if (!subCmd) return false;
  // Whitelist: sadece APT_READ_ONLY izinli
  return !APT_READ_ONLY.has(subCmd);
}
