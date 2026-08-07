export function fail2banHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('fail2ban-client');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 15).trimStart();

  // Boş veya sadece flag'ler
  if (!rest || rest.startsWith('-')) return false;

  // İlk token = subcommand
  const spaceIdx = rest.indexOf(' ');
  const subcmd = spaceIdx === -1 ? rest : rest.substring(0, spaceIdx);

  // status / gettag → read-only
  const readOnlySubcmds = ['status', 'gettag'];
  if (readOnlySubcmds.includes(subcmd.toLowerCase())) return false;

  // Diğer tüm komutlar → write
  return true;
}
