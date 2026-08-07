export function firewallCmdHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('firewall-cmd');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 12).trimStart();

  // --list-* veya --get-* ile başlayan okuma komutları
  if (rest.startsWith('--list-') || rest.startsWith('--get-')) return false;

  // Diğer - flag'leri atla
  while (rest.startsWith('-') && !rest.startsWith('--')) {
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx === -1) break;
    rest = rest.substring(spaceIdx).trimStart();
  }

  // Kalan --list-* veya --get-* kontrolü
  if (rest.startsWith('--list-') || rest.startsWith('--get-')) return false;

  // Diğer tüm komutlar yazma olarak kabul
  return true;
}
