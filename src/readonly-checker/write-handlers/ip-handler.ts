import { IP_READ_ONLY, IP_READ_ONLY_SUBCOMMANDS } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function ipHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('ip');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 2).trimStart();
  rest = skipShortFlags(rest);
  const subCmd = getFirstToken(rest);
  if (!subCmd) return false;
  const subCmdLower = subCmd.toLowerCase();

  // ip {addr,link,route,...} {show,list} → okuma
  if (IP_READ_ONLY.has(subCmdLower)) {
    let nsRest = skipShortFlags(rest.substring(subCmd.length).trimStart());
    const action = getFirstToken(nsRest);
    // Subcommand mapping varsa ve action whitelist'te → okuma
    const allowedActions = IP_READ_ONLY_SUBCOMMANDS.get(subCmdLower);
    if (allowedActions && action && allowedActions.includes(action)) return false;
    // Subcommand mapping yoksa → okuma (monitor, check, session gibi)
    if (!allowedActions) return false;
    // Action whitelist'te yoksa → yazma
    return true;
  }

  // Whitelist: READ_ONLY listesinde yoksa → yazma
  return true;
}
