import { getFirstToken as baseGetFirstToken, skipShortFlags as baseSkipShortFlags } from '../write-handlers/base-handler.js';

export const getFirstToken = baseGetFirstToken;
export const skipShortFlags = baseSkipShortFlags;

/** Komutu çöz: sudo/su/ssh peel-through */
export function resolveCommand(cmd: string): string {
  const firstToken = baseGetFirstToken(cmd);

  if (firstToken === 'sudo') {
    let rest = cmd.substring(firstToken.length).trimStart();
    while (rest.startsWith('-') && !rest.match(/^[a-zA-Z]/)) {
      const flagEnd = rest.search(/\s+/);
      const flag = flagEnd === -1 ? rest : rest.substring(0, flagEnd);
      // -l (list sudo perms) ve diğer okuma flag'leri → son flag, sudo olarak döndür
      if (flag === '-l' || flag === '-L' || flag === '-V' || flag === '--version' || flag === '--help') {
        return 'sudo';
      }
      if (flagEnd === -1) break;
      const afterFlag = rest.substring(flagEnd).trimStart();
      if (afterFlag.startsWith('-')) {
        const nextFlagEnd = afterFlag.search(/\s+/);
        if (nextFlagEnd === -1) break;
        rest = afterFlag.substring(nextFlagEnd).trimStart();
      } else {
        rest = afterFlag;
        break;
      }
    }
    return resolveCommand(rest);
  }

  if (firstToken === 'su') {
    const rest = cmd.substring(firstToken.length).trimStart();
    const cMatch = rest.match(/-c\s+['"]?(.+?)['"]?$/);
    if (cMatch) return resolveCommand(cMatch[1]);
    return firstToken;
  }

  if (firstToken === 'ssh') {
    const rest = cmd.substring(firstToken.length).trimStart();
    // Tek tırnak içindeki host'u çıkar
    const quotedMatch = rest.match(/^['"]?([^'"\s]+@[^'"\s]+)['"]?\s*(.*)$/);
    if (quotedMatch) {
      const afterHost = quotedMatch[2].trimStart();
      if (afterHost) return resolveCommand(afterHost);
      return firstToken;
    }
    // Tırnaksız host
    const hostPattern = /[^'"\s]+@[^'"\s]+/;
    const match = rest.match(hostPattern);
    if (match && match.index !== undefined) {
      const afterHost = rest.substring(match.index + match[0].length).trimStart();
      if (afterHost) return resolveCommand(afterHost);
    }
    return firstToken;
  }

  // Wrapper komutlar (timeout/nice/time/...) iç komutu çalıştırır → iç komutu çöz
  if (firstToken === 'env' || firstToken in WRAPPERS) {
    const inner = extractWrapperInner(firstToken, cmd.substring(firstToken.length));
    if (inner) return resolveCommand(inner);
    return firstToken; // çıplak wrapper → zararsız no-op / read-only
  }

  return firstToken;
}

interface WrapperSpec {
  valueFlags: Set<string>;
  skipPositionals: number;
}

const WRAPPERS: Record<string, WrapperSpec> = {
  timeout: { valueFlags: new Set(['-k', '--kill-after', '-s', '--signal']), skipPositionals: 1 },
  nice: { valueFlags: new Set(['-n']), skipPositionals: 0 },
  stdbuf: { valueFlags: new Set(['-i', '-o', '-e', '--input', '--output', '--error']), skipPositionals: 0 },
  ionice: { valueFlags: new Set(['-c', '--class', '-n', '--id', '-p', '--pid']), skipPositionals: 0 },
  time: { valueFlags: new Set(), skipPositionals: 0 },
  command: { valueFlags: new Set(), skipPositionals: 0 },
  builtin: { valueFlags: new Set(), skipPositionals: 0 },
  nohup: { valueFlags: new Set(), skipPositionals: 0 },
  setsid: { valueFlags: new Set(), skipPositionals: 0 },
};

function extractWrapperInner(name: string, rest: string): string | null {
  const toks = rest.trim().split(/\s+/).filter(Boolean);
  if (name === 'env') {
    let i = 0;
    while (i < toks.length) {
      const t = toks[i];
      if (t.startsWith('-')) { i++; continue; }
      if (t.includes('=')) { i++; continue; } // NAME=VALUE ataması
      return toks.slice(i).join(' ');
    }
    return null;
  }
  const spec = WRAPPERS[name];
  if (!spec) return null;
  let i = 0;
  let skipped = 0;
  while (i < toks.length) {
    const t = toks[i];
    if (t.startsWith('-')) {
      const flagName = t.split('=')[0];
      i++;
      if (spec.valueFlags.has(flagName)) i++;
      continue;
    }
    if (skipped < spec.skipPositionals) { skipped++; i++; continue; }
    return toks.slice(i).join(' ');
  }
  return null;
}
