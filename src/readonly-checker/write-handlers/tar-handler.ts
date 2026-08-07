// tar: sadece bu flag'ler okuma olarak kabul edilir
const TAR_SAFE_FLAGS = new Set([
  't', 'tf', 'tvf', 'tzf', 'tc', 'tcv',
]);

export function tarHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('tar');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 3).trimStart();

  // İlk token = flag grubu (-cf, -xf, t, tf, vb.)
  const tokens = rest.split(/\s+/);
  if (!tokens[0]) return false;

  const firstToken = tokens[0];

  // -cf, -xf gibi combined flags
  if (firstToken.startsWith('-')) {
    const flags = firstToken.substring(1);
    // -c veya --create → yazma
    if (flags.includes('c')) return true;
    // -x veya --extract → yazma
    if (flags.includes('x')) return true;
    // -t veya --list → okuma
    if (flags.includes('t')) return false;
    return true;
  }

  // Whitelist: sadece safe flags izinli
  return !TAR_SAFE_FLAGS.has(firstToken);
}
