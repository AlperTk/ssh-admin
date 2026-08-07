export function curlWgetHasWriteArg(cmd: string): boolean {
  // -o/-O output file
  if (/\s-[oO]\s/.test(cmd) || /\s-[oO]$/.test(cmd)) return true;
  // -d/--data data exfiltration
  if (/\s-[dD]\s/.test(cmd) || /\s-[dD]$/.test(cmd)) return true;
  if (/--data\s*=/.test(cmd) || /--post-data\s*=/.test(cmd)) return true;

  return false;
}
