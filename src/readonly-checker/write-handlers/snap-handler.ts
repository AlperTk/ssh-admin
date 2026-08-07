import { SNAP_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function snapHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('snap');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 4).trimStart();
  rest = skipShortFlags(rest);
  const subCmd = getFirstToken(rest);
  if (!subCmd) return false;
  const subCmdLower = subCmd.toLowerCase();
  if (SNAP_READ_ONLY.has(subCmdLower)) return false;
  return true;
}
