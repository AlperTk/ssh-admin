import { skipShortFlags } from './base-handler.js';

export function crontabHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('crontab');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 7).trimStart();

  // İlk flag'i kontrol et (yazma flag'i olabilir)
  if (rest.startsWith('-e') && (rest.length === 2 || !/\w/.test(rest[2]))) return true;
  if (rest.startsWith('-r') && (rest.length === 2 || !/\w/.test(rest[2]))) return true;
  if (rest.startsWith('-R') && (rest.length === 2 || !/\w/.test(rest[2]))) return true;
  if (rest === '-' || (rest.startsWith('- ') )) return true;

  rest = skipShortFlags(rest);

  // skipShortFlags sonrası tüm metinde - flag kontrolü (stdin bypass)
  if (hasStandaloneDash(rest)) return true;

  // -u user flag atla
  if (rest.startsWith('-u') || rest.startsWith('-U')) {
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx !== -1) rest = rest.substring(spaceIdx).trimStart();
    else rest = '';
  }

  // -u atladıktan sonra tekrar - kontrolü
  if (hasStandaloneDash(rest)) return true;

  return false;
}

function hasStandaloneDash(s: string): boolean {
  if (s === '-') return true;
  const parts = s.split(/\s+/);
  for (const part of parts) {
    if (part === '-') return true;
  }
  return false;
}
