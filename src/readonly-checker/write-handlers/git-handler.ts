import { GIT_READ_ONLY, GIT_STASH_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken } from './base-handler.js';

export function gitHasWriteArg(cmd: string): boolean {
  const rest = cmd.substring(4).trimStart();
  const token = getFirstToken(rest);

  if (token === 'stash') {
    let rest2 = rest.substring(token.length).trimStart();
    const thirdToken = getFirstToken(rest2);
    if (thirdToken && !GIT_STASH_READ_ONLY.includes(thirdToken as any)) return true;
    return false;
  }

  // Whitelist: sadece READ_ONLY listesindeki komutlar izinli
  if (!GIT_READ_ONLY.includes(token as any)) return true;

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
