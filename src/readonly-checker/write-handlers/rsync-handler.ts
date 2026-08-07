// rsync dosya kopyalama aracı — her zaman yazma olarak kabul edilir
export function rsyncHasWriteArg(): boolean {
  return true;
}
