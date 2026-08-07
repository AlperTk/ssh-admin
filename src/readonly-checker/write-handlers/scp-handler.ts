export function scpHasWriteArg(cmd: string): boolean {
  let rest = cmd.trimStart();

  // Skip short flags (-r, -P, -p, etc.)
  while (rest.startsWith('-')) {
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx === -1) return false;
    rest = rest.substring(spaceIdx).trimStart();
  }

  // scp -i flag ile identity file belirtilebilir, onu da atla
  if (rest.startsWith('-i')) {
    const flagEnd = rest.indexOf(' ');
    if (flagEnd === -1) return true;
    rest = rest.substring(flagEnd).trimStart();
  }

  // Remote source pattern: user@host:/path
  const hasRemoteSource = /@\S+:[~\/]/.test(rest);

  // Remote destination pattern: user@host:/path veya user@host~/path
  const hasRemoteDest = /@[^\s:]+:[~\/]/.test(rest);

  // Her iki taraf da remote ise download (read), sadece destination remote ise upload (write)
  if (hasRemoteSource && !hasRemoteDest) return false;
  if (hasRemoteDest) return true;

  // scp without remote destination but with multiple args → likely upload
  const parts = rest.split(/\s+/);
  if (parts.length >= 2) {
    return true;
  }
  return false;
}
