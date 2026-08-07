// ar (archive): her zaman yazma işlemi yapar.
// .a archive dosyası oluşturur/değiştirir — read-only alt komutu yoktur.
export function arHasWriteArg(_cmd: string): boolean {
  return true;
}
