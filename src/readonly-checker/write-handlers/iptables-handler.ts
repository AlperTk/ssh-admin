import { IPTABLES_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function iptablesHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('iptables');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 8).trimStart();

  // Önce tüm short flag'ları kontrol et — hepsi read-only ise izin ver
  let tempRest = rest;
  while (tempRest.startsWith('-') && !tempRest.startsWith('--')) {
    const spaceIdx = tempRest.indexOf(' ');
    const flag = spaceIdx === -1 ? tempRest : tempRest.substring(0, spaceIdx);
    if (!IPTABLES_READ_ONLY.has(flag)) {
      return true; // write flag bulundu
    }
    if (spaceIdx === -1) break;
    tempRest = tempRest.substring(spaceIdx).trimStart();
  }

  // Short flag'lar bitti, long flag'lara geç
  rest = skipShortFlags(rest);
  // Redirection'ları atla (2>/dev/null, >file, >>file vb.)
  const redirIdx = rest.search(/[>|&]\s*\/|>[>&]?\s*$/);
  if (redirIdx !== -1) {
    rest = rest.substring(0, redirIdx).trimEnd();
  }
  const flag = getFirstToken(rest);
  if (!flag) return false;
  if (flag.startsWith('-')) {
    return !IPTABLES_READ_ONLY.has(flag);
  }
  return true;
}
