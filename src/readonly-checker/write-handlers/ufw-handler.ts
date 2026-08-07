import { UFW_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function ufwHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('ufw');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 3).trimStart();
  rest = skipShortFlags(rest);
  const subCmd = getFirstToken(rest);
  if (!subCmd) return false;
  const subCmdLower = subCmd.toLowerCase();
  // ufw status numbered gibi multi-word subcommand'ları kontrol et
  if (UFW_READ_ONLY.has(subCmdLower)) return false;
  return true;
}
