// curl için safe flag whitelist — bilinmeyen her şey engellenir
const CURL_SAFE_FLAGS = new Set([
  '-s', '-v', '-I', '-w', '-A', '-e', '-H', '-b', '-c', '-G',
  '-4', '-6', '-L', '-k', '-m', '--compressed', '--retry',
  '--connect-timeout', '--max-time', '--interface', '--tcpnodelay',
  '--globoff', '--progress-bar', '--remote-name-all', '--silent',
  '--verbose', '--head', '--write-out', '--user-agent', '--referer',
  '--header', '--cookie', '--cookie-jar', '--get', '--ipv4',
  '--ipv6', '--location', '--insecure', '--max-time',
]);

// curl: file-writing long flags (whitelist'da yoksa engelle)
const CURL_WRITE_LONG_FLAGS = new Set([
  'output', 'dump-header', 'trace', 'trace-ascii', 'libcurl',
  'stderr', 'config', 'egd-file', 'log-file', 'random-file',
  'output-dir', 'compressed-session-file', 'tlsautofingerprint',
  'tlspinnedkey', 'unix-socket', 'proxy-service-name', 'service-name',
]);

export function curlWgetHasWriteArg(cmd: string): boolean {
  // === WGET: tüm HTTP/FTP çağrıları write'dır ===
  if (/\bwget\b/.test(cmd)) return true;

  // === CURL: safe flag whitelist ===
  if (!/\bcurl\b/.test(cmd)) return false;

  const tokens = cmd.split(/\s+/);
  let hasUnknownFlag = false;
  let hasWriteFlag = false;

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    // Long flag: --flag=value veya --flag value
    if (token.startsWith('--')) {
      const flagName = token.split('=')[0];
      if (CURL_WRITE_LONG_FLAGS.has(flagName)) {
        hasWriteFlag = true;
      } else if (!CURL_SAFE_FLAGS.has(flagName)) {
        hasUnknownFlag = true;
      }
      continue;
    }

    // Short flag: -X veya combined -abc
    if (token.startsWith('-') && !token.startsWith('--')) {
      const flags = token.substring(1).split('');
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
  if (hasUnknownFlag) return true;
  // Write flag varsa → engelle
  if (hasWriteFlag) return true;

  return false;
}
