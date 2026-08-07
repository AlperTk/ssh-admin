function skipFlags(rest: string): string {
  while (rest.startsWith('-') && !rest.startsWith('--')) {
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx === -1) return '';
    rest = rest.substring(spaceIdx).trimStart();
  }
  return rest;
}

export function crontabHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('crontab');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 7).trimStart();

  // İlk flag'i kontrol et (yazma flag'i olabilir)
  if (rest.startsWith('-e') && (rest.length === 2 || !/\w/.test(rest[2]))) return true;

  rest = skipFlags(rest);

  // -u user flag atla
  if (rest.startsWith('-u') || rest.startsWith('-U')) {
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx !== -1) rest = rest.substring(spaceIdx).trimStart();
    else rest = '';
  }

  return false;
}
