import { getFirstToken, skipFlags } from './base-handler.js';

export function sysctlHasWriteArg(cmd: string): boolean {
  const rest = cmd.substring(7).trimStart();
  // -w flag kontrolü (yazma)
  if (/\b-w\b/.test(rest)) return true;
  if (/\b--write\b/.test(rest)) return true;
  // Read-only: -n, -a, -p, --system, --all, --pattern, --tree, --names, --units, --format
  const afterFlags = skipFlags(rest);
  if (afterFlags === '') return false;
  const token = getFirstToken(afterFlags);
  // sysctl key=value format — yazma olarak kabul et
  if (token && /\./.test(token) && /=/.test(token)) return true;
  return false;
}
