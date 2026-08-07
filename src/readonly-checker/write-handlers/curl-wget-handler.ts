export function curlWgetHasWriteArg(cmd: string): boolean {
  // -o/-O output file (combined flags destekler: -sO, -OL, -sOL, --output...)
  if (/\s-[^\s]*[oO]/.test(cmd)) return true;
  if (/--output\s*=\s*file/i.test(cmd)) return true;
  // --content-disposition → dosya adı HTTP header'dan alınır
  if (/--content-disposition/.test(cmd)) return true;
  // flagsiz wget → varsayılan index.html yazar
  if (/\bwget\b\s+https?:\/\//.test(cmd)) return true;
  // -d/--data data exfiltration
  if (/\s-[dD]\b/.test(cmd) || /\s-[dD]$/.test(cmd)) return true;
  if (/--data\s*=/.test(cmd) || /--post-data\s*=/.test(cmd)) return true;

  return false;
}
