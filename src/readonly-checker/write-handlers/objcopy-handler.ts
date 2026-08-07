// objcopy: her zaman yazma işlemi yapar.
// Binary dosyayı kopyalar ve sembol/section manipülasyonu yapar — orijinal dosyayı değiştirir.
export function objcopyHasWriteArg(_cmd: string): boolean {
  return true;
}
