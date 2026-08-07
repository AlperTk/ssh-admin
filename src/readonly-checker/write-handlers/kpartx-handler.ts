import { KPARTX_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function kpartxHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('kpartx');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 6).trimStart();
  rest = skipShortFlags(rest);
  const flag = getFirstToken(rest);
  if (!flag) return false;
  if (flag.startsWith('--')) {
    return !KPARTX_READ_ONLY.has(flag);
  }
  if (flag.startsWith('-')) {
    return !KPARTX_READ_ONLY.has(flag);
  }
  return true;
}
