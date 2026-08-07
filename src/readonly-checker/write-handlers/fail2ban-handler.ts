// fail2ban-client: okuma subcommand'ları whitelist
const FAIL2BAN_READ_ONLY = new Set([
  'status', 'gettag', 'ping', 'help', 'version',
]);

export function fail2banHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('fail2ban-client');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 15).trimStart();

  // Boş veya sadece flag'ler
  if (!rest || rest.startsWith('-')) return false;

  // İlk token = subcommand
  const spaceIdx = rest.indexOf(' ');
  const subcmd = spaceIdx === -1 ? rest : rest.substring(0, spaceIdx);

  // Whitelist: sadece READ_ONLY subcommand'lar izinli
  return !FAIL2BAN_READ_ONLY.has(subcmd.toLowerCase());
}
