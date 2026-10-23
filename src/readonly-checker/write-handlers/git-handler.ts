import { GIT_READ_ONLY, GIT_STASH_READ_ONLY } from '../../data/readonly-rules.js';
import { getFirstToken, skipFlags, isInReadonlyList } from './base-handler.js';

const GIT_CONFIG_READ_MODE_FLAGS = new Set(['--get', '--get-all', '--get-regexp', '--get-urlmatch', '--list', '-l']);
const GIT_CONFIG_READ_FLAGS = new Set([
  ...GIT_CONFIG_READ_MODE_FLAGS, '--show-origin', '--show-scope', '--name-only', '-z', '--null',
  '--local', '--includes', '--no-includes', '--type', '--bool', '--int', '--path', '--default', '--expiry-date',
]);

// Yazma: yazma/kapsam bayrağı (--add, --unset, -f, --global, -e ...) ya da okuma modu dışında iki konumsal (key value)
function gitConfigIsWrite(args: string): boolean {
  const toks = args.trim().split(/\s+/).filter(Boolean);
  let readMode = false;
  let positional = 0;
  for (const t of toks) {
    if (t.startsWith('-')) {
      const name = t.split('=')[0];
      if (!GIT_CONFIG_READ_FLAGS.has(name)) return true;
      if (GIT_CONFIG_READ_MODE_FLAGS.has(name)) readMode = true;
    } else {
      positional++;
    }
  }
  return !readMode && positional > 1;
}

export function gitHasWriteArg(cmd: string): boolean {
  // --output dosya yazar (diff/log/show); konumu ne olursa olsun reddet
  if (cmd.split(/\s+/).some(t => t.startsWith('--output'))) return true;

  const rest = cmd.substring(4).trimStart();
  const afterFlags = skipFlags(rest);
  const token = getFirstToken(afterFlags);

  if (token === '') return false;

  if (token === 'stash') {
    let rest2 = afterFlags.substring(token.length).trimStart();
    const thirdToken = getFirstToken(rest2);
    if (thirdToken && !isInReadonlyList(GIT_STASH_READ_ONLY, thirdToken)) return true;
    return false;
  }

  // Whitelist: sadece READ_ONLY listesindeki komutlar izinli
  if (!isInReadonlyList(GIT_READ_ONLY, token)) return true;

  // git config: yazma/kapsam bayrakları ve set formu kalıcı yazma
  if (token === 'config') return gitConfigIsWrite(afterFlags.substring(token.length));

  return false;
}
