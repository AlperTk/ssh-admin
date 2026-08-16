export function trapHasWriteArg(cmd: string): boolean {
  // 'trap' tek başına trap'ları listeler (read); argümanlı kullanım değiştirir (write)
  return cmd.trim() !== 'trap';
}
