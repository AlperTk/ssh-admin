// tar: sadece bu flag'ler okuma olarak kabul edilir
const TAR_SAFE_FLAGS = new Set([
  't', 'tf', 'tvf', 'tzf', 'tc', 'tcv',
  '--list', '--list-newer', '-t',
]);

export function tarHasWriteArg(cmd: string): boolean {
  const match = cmd.toLowerCase().match(/\btar\b/);
  if (!match) return false;
  const idx = match.index!;
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
    // -r veya --append → yazma
    if (flags.includes('r')) return true;
    // -u veya --update → yazma
    if (flags.includes('u')) return true;
    // -t veya --list → okuma
    if (flags.includes('t') && !flags.includes('x') && !flags.includes('c') && !flags.includes('r') && !flags.includes('u')) return false;
    return true;
  }

  // --warning flag ile archive bomb uyarıları bastırılabilir
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i].startsWith('--warning=')) {
      return true;
    }
  }

  // Whitelist: sadece safe flags izinli
  return !TAR_SAFE_FLAGS.has(firstToken);
}
