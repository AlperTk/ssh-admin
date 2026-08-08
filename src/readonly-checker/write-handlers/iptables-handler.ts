import { IPTABLES_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function iptablesHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('iptables');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 8).trimStart();

  // Redirection'ları temizle (2>/dev/null, >file, >>file, | cmd vb.)
  rest = rest.replace(/\s*[|&]\s*\S|\s*[21]>[>&]?\s*\S+/g, '').trimStart();

  // -L, -S veya -C görüldüğünü takip et
  let hasListOrShow = false;

  // Önce tüm short flag'ları kontrol et — hepsi read-only ise izin ver
  let tempRest = rest;
  while (tempRest.startsWith('-') && !tempRest.startsWith('--')) {
    const spaceIdx = tempRest.indexOf(' ');
    const flag = spaceIdx === -1 ? tempRest : tempRest.substring(0, spaceIdx);
    if (!IPTABLES_READ_ONLY.has(flag)) {
      return true; // write flag bulundu
    }
    if (flag === '-L' || flag === '-S' || flag === '-C') hasListOrShow = true;
    // -t TABLE → tablo ismini atla
    if (flag === '-t' && spaceIdx !== -1) {
      const afterTable = tempRest.substring(spaceIdx).trimStart();
      const tableEnd = afterTable.indexOf(' ');
      if (tableEnd !== -1) {
        tempRest = afterTable.substring(tableEnd).trimStart();
        continue;
      }
    }
    if (spaceIdx === -1) break;
    tempRest = tempRest.substring(spaceIdx).trimStart();
  }

  // Short flag'lar bitti, long flag'lara geç
  rest = skipShortFlags(rest);
  const flag = getFirstToken(rest);
  if (!flag) return false;
  if (flag.startsWith('-')) {
    return !IPTABLES_READ_ONLY.has(flag);
  }
  // -L CHAIN veya -S CHAIN hala read-only (chain ismi sadece filtre)
  if (hasListOrShow) return false;
  return true;
}
