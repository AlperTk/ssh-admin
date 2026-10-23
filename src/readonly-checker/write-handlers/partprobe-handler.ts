import { PARTPROBE_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function partprobeHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('partprobe');
  if (idx === -1) return false;
  const original = cmd.substring(idx + 9).trimStart();
  // bare partprobe re-reads the partition tables of all disks
  if (!original) return true;
  let rest = skipShortFlags(original);
  // skipShortFlags() returns '' when only short flags remain: classify each flag char
  if (!rest) {
    return !original.split(/\s+/).filter(Boolean).every((t) => [...t.slice(1)].every((c) => PARTPROBE_READ_ONLY.has(`-${c}`)));
  }
  const flag = getFirstToken(rest);
  if (!flag) return false;
  if (flag.startsWith('-')) {
    return !PARTPROBE_READ_ONLY.has(flag);
  }
  return true;
}
