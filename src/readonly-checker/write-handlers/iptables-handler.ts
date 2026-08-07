import { IPTABLES_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function iptablesHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('iptables');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 8).trimStart();
  rest = skipShortFlags(rest);
  const flag = getFirstToken(rest);
  if (!flag) return false;
  if (flag.startsWith('-')) {
    return !IPTABLES_READ_ONLY.has(flag);
  }
  return true;
}
