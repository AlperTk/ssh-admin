import { TUNE2FS_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken } from '../resolution/command-resolver.js';

export function tune2fsHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('tune2fs');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 7).trimStart();
  let hasUnsafeFlag = false;
  // Short flag'leri kontrol et
  while (rest.startsWith('-') && !rest.startsWith('--')) {
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx === -1) {
      const flag = rest;
      if (!TUNE2FS_READ_ONLY.has(flag)) return true;
      return false;
    }
    const flag = rest.substring(0, spaceIdx);
    if (!TUNE2FS_READ_ONLY.has(flag)) {
      hasUnsafeFlag = true;
      rest = rest.substring(spaceIdx).trimStart();
      continue;
    }
    rest = rest.substring(spaceIdx).trimStart();
  }
  if (hasUnsafeFlag) return true;
  const flag = getFirstToken(rest);
  if (!flag) return false;
  if (flag.startsWith('--')) {
    return !TUNE2FS_READ_ONLY.has(flag);
  }
  return false;
}
