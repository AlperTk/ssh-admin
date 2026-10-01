import { GIT_READ_ONLY, GIT_STASH_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipFlags, isInReadonlyList } from './base-handler.js';

export function gitHasWriteArg(cmd: string): boolean {
  const rest = cmd.substring(4).trimStart();
  const afterFlags = skipFlags(rest);
  const token = getFirstToken(afterFlags);

  if (token === '') return false;

  if (token === 'stash') {
    let rest2 = afterFlags.substring(token.length).trimStart();
    const thirdToken = getFirstToken(rest2);
    if (thirdToken && !isInReadonlyList(GIT_STASH_READ_ONLY, thirdToken)) return true;
    return false;
  }

  // Whitelist: sadece READ_ONLY listesindeki komutlar izinli
  if (!isInReadonlyList(GIT_READ_ONLY, token)) return true;

  // git config --global / --system / -f → kalıcı yazma
  if (token === 'config') {
    let afterConfig = rest.substring(token.length).trimStart();
    // -f flag önce kontrol et (skipFlags önce çalışmalı)
    if (afterConfig.startsWith('-f') && (afterConfig.length === 2 || !/\w/.test(afterConfig[2]))) return true;
    while (afterConfig.startsWith('-') && !afterConfig.startsWith('--')) {
      const spaceIdx = afterConfig.indexOf(' ');
      if (spaceIdx === -1) return false;
      afterConfig = afterConfig.substring(spaceIdx).trimStart();
    }
    if (afterConfig.startsWith('--global') || afterConfig.startsWith('--system')) return true;
  }

  return false;
}
