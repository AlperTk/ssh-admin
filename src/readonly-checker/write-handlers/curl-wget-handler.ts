// WGET: tüm HTTP/FTP çağrıları write olarak kabul edilir.
// Neden: wget varsayılan olarak dosyaya yazar (-O hariç okuma modu yok).
// -O flag ile stdout'a yazılabilir ama bu edge case olarak bırakıldı.
// curl: safe flag whitelist yaklaşımı — sadece bilinen flags izinli.
const CURL_SAFE_FLAGS = new Set([
  '-s', '-v', '-I', '-w', '-A', '-e', '-H', '-b', '-c', '-G',
  '-4', '-6', '-L', '-k', '-m', '--compressed', '--retry',
  '--connect-timeout', '--max-time', '--interface', '--tcpnodelay',
  '--globoff', '--progress-bar', '--remote-name-all', '--silent',
  '--verbose', '--head', '--write-out', '--user-agent', '--referer',
  '--header', '--cookie', '--cookie-jar', '--get', '--ipv4',
  '--ipv6', '--location', '--insecure',
]);

export function curlWgetHasWriteArg(cmd: string): boolean {
  // WGET implicit blacklist: wget için whitelist yok, tüm çağrılar engellenir.
  // wget'in read-only modu yoktur (her çağrı dosya yazar).
  if (/\bwget\b/.test(cmd)) return true;

  // === CURL: safe flag whitelist ===
  if (!/\bcurl\b/.test(cmd)) return false;

  const tokens = cmd.split(/\s+/);
  let hasUnknownFlag = false;

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    // Long flag: --flag=value veya --flag value
    if (token.startsWith('--')) {
      const flagName = token.split('=')[0];
      if (!CURL_SAFE_FLAGS.has(flagName)) {
        hasUnknownFlag = true;
      }
      continue;
    }

    // Short flag: -X veya combined -abc
    if (token.startsWith('-') && !token.startsWith('--')) {
      const flags = token.substring(1);
      if (flags.includes('o') || flags.includes('O')) {
        hasUnknownFlag = true;
        continue;
      }
      for (const f of flags) {
        const flagKey = '-' + f;
        if (!CURL_SAFE_FLAGS.has(flagKey)) {
          hasUnknownFlag = true;
        }
      }
      continue;
    }
  }

  // Bilinmeyen flag varsa → engelle
  return hasUnknownFlag;
}
