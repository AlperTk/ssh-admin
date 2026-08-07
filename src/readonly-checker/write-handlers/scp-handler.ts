export function scpHasWriteArg(cmd: string): boolean {
  // scp source user@host:path → write (upload)
  // scp user@host:path dest → write (download with remote as source)
  // scp -r user@host:/path local → write
  // scp -P port user@host:/path local → write
  // Remote destination pattern: user@host:/path veya user@host~/path
  if (/@\S+:[~\/]/.test(cmd)) return true;
  // scp without remote destination but with multiple args → likely upload
  // scp file1 file2 → write to second location
  const parts = cmd.split(/\s+/);
  if (parts.length >= 3 && !/@/.test(parts[1])) {
    // scp <source> <dest> — dest'e yazıyor
    return true;
  }
  return false;
}
