import { GIT_READ_ONLY, GIT_STASH_READ_ONLY } from '../../data/readonly-rules.js';

export function gitHasWriteArg(cmd: string): boolean {
  const rest = cmd.substring(4).trimStart();
  let token = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i];
    if (ch === "'" && !inDoubleQuote) { inSingleQuote = !inSingleQuote; }
    else if (ch === '"' && !inSingleQuote) { inDoubleQuote = !inDoubleQuote; }
    else if (!inSingleQuote && !inDoubleQuote) {
      if (ch === ' ' || ch === '\t' || ch === ';') break;
      token += ch;
    } else { token += ch; }
  }

  if (token === 'stash') {
    let rest2 = rest.substring(token.length).trimStart();
    let thirdToken = '';
    let sq = false, dq = false;
    for (let i = 0; i < rest2.length; i++) {
      const ch = rest2[i];
      if (ch === "'" && !dq) { sq = !sq; }
      else if (ch === '"' && !sq) { dq = !dq; }
      else if (!sq && !dq) {
        if (ch === ' ' || ch === '\t' || ch === ';') break;
        thirdToken += ch;
      } else { thirdToken += ch; }
    }
    if (thirdToken && !GIT_STASH_READ_ONLY.includes(thirdToken as any)) return true;
    return false;
  }

  // Whitelist: sadece READ_ONLY listesindeki komutlar izinli
  return !GIT_READ_ONLY.includes(token as any);
}
