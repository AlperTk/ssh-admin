export function aliasHasWriteArg(cmd: string): boolean {
  // 'alias' tek başına alias'ları listeler (read); tanımlama write'tır
  return cmd.trim() !== 'alias';
}
