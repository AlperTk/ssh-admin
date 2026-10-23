import { KPARTX_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function kpartxHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('kpartx');
  if (idx === -1) return false;
  const original = cmd.substring(idx + 6).trimStart();
  let rest = skipShortFlags(original);
  // skipShortFlags() returns '' when only short flags remain: classify each flag char
  if (!rest && original) {
    return !original.split(/\s+/).filter(Boolean).every((t) => [...t.slice(1)].every((c) => KPARTX_READ_ONLY.has(`-${c}`)));
  }
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
