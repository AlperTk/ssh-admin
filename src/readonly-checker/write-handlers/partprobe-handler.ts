import { PARTPROBE_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function partprobeHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('partprobe');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 9).trimStart();
  rest = skipShortFlags(rest);
  const flag = getFirstToken(rest);
  if (!flag) return false;
  if (flag.startsWith('-')) {
    return !PARTPROBE_READ_ONLY.has(flag);
  }
  return true;
}
