import { GIT_READ_ONLY, GIT_STASH_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken } from '../resolution/command-resolver.js';

export function gitHasWriteArg(cmd: string): boolean {
  const rest = cmd.substring(4).trimStart();
  const token = getFirstToken(rest);

  if (token === 'stash') {
    let rest2 = rest.substring(token.length).trimStart();
    const thirdToken = getFirstToken(rest2);
    if (thirdToken && !GIT_STASH_READ_ONLY.includes(thirdToken as any)) return true;
    return false;
  }

  // Whitelist: sadece READ_ONLY listesindeki komutlar izinli
  return !GIT_READ_ONLY.includes(token as any);
}
