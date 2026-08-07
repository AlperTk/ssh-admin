import { DMSETUP_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function dmsetupHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('dmsetup');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 7).trimStart();
  rest = skipShortFlags(rest);
  const subCmd = getFirstToken(rest);
  if (!subCmd) return false;
  const subCmdLower = subCmd.toLowerCase();
  // Subcommand whitelist'te varsa → okuma
  if (DMSETUP_READ_ONLY.has(subCmdLower)) return false;
  // Bilinmeyen subcommand → yazma
  return true;
}
