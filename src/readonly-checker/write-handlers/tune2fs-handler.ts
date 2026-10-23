import { TUNE2FS_READ_ONLY } from '../../data/readonly-rules.js';

export function tune2fsHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('tune2fs');
  if (idx === -1) return false;
  // Shell strips quotes/escapes before exec: '-c' and "-O" are the same flags
  let rest = cmd.substring(idx + 7).replace(/["'\\]/g, '').trimStart();
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
  // getopt permutes args: any write flag after the device is still applied
  return rest.split(/\s+/).some((t) => t.startsWith('-') && !TUNE2FS_READ_ONLY.has(t));
}  // getopt permutes args: any write flag after the device is still applied\n  return rest.split(/\s+/).some((t) => t.startsWith('-') && !TUNE2FS_READ_ONLY.has(t));\n}
