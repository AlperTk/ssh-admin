import { JOURNALCTL_SAFE_FLAGS } from '../../data/readonly-rules.js';
import { getFirstToken } from './base-handler.js';

export function journalctlHasWriteArg(cmd: string): boolean {
  const idx = cmd.toLowerCase().indexOf('journalctl');
  if (idx === -1) return false;
  const rest = cmd.substring(idx + 10).trimStart();
  // Whitelist: sadece SAFE_FLAGS listesindeki flag'ler izinli
  const tokens = rest.split(/\s+/);
  for (const token of tokens) {
    // Sadece flag'leri kontrol et (- ile başlayanlar)
    if (!token.startsWith('-')) continue;
    const flag = token.split('=')[0];
    
    // Long flag (--xxx)
    if (flag.startsWith('--')) {
      if (!JOURNALCTL_SAFE_FLAGS.has(flag)) return true;
      continue;
    }
    
    // Short flag veya combined short flags (-x, -xe, -xy)
    if (flag.length === 2) {
      // Tek short flag (-x)
      if (!JOURNALCTL_SAFE_FLAGS.has(flag)) return true;
    } else if (flag.length > 2) {
      // Combined short flags (-xe → -x, -e)
      for (let i = 1; i < flag.length; i++) {
        if (!JOURNALCTL_SAFE_FLAGS.has('-' + flag[i])) return true;
      }
    }
  }
  return false;
}
