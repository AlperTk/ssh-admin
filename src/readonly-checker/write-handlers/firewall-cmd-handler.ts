export function firewallCmdHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('firewall-cmd');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 12).trimStart();

  // Short flag'leri atla
  while (rest.startsWith('-') && !rest.startsWith('--')) {
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx === -1) return false;
    rest = rest.substring(spaceIdx).trimStart();
  }

  // Whitelist: --list-* ve --get-* okuma flag'leri
  if (rest.startsWith('--list-') || rest.startsWith('--get-')) return false;

  // Diğer tüm komutlar → yazma
  return true;
}
