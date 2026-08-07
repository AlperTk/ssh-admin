export function scpHasWriteArg(cmd: string): boolean {
  let rest = cmd.trimStart();

  // Skip short flags (-r, -P, -p, etc.)
  while (rest.startsWith('-')) {
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx === -1) return false;
    rest = rest.substring(spaceIdx).trimStart();
  }

  // Remote destination pattern: user@host:/path veya user@host~/path
  if (/@\S+:[~\/]/.test(rest)) return true;

  // scp without remote destination but with multiple args → likely upload
  const parts = rest.split(/\s+/);
  if (parts.length >= 2 && !/@/.test(parts[0])) {
    return true;
  }
  return false;
}
