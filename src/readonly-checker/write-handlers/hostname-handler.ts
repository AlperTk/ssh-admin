import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';

export function hostnameHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('hostname');
  if (idx === -1) return false;
  let rest = cmd.substring(idx + 8).trimStart();
  rest = skipShortFlags(rest); // -f/-i/-s/-d gibi okuma flag'leri
  const subCmd = getFirstToken(rest);
  // argüman yok → hostname göster (read); argüman var → hostname set et (write)
  return subCmd !== '';
}
