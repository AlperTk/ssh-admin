import { SYSTEMCTL_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function systemctlHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('systemctl');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 9).trimStart();
  rest = skipShortFlags(rest);
  const subCmd = getFirstToken(rest);
  if (!subCmd) return false;
  // Whitelist: sadece READ_ONLY listesindeki komutlar izinli
  return !SYSTEMCTL_READ_ONLY.has(subCmd);
}
