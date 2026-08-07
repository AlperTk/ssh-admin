import { DOCKER_READ_ONLY, DOCKER_WRITE_COMMANDS, DOCKER_NAMESPACE_WRITE } from '../../data/readonly-rules.js';

function getFirstToken(cmd: string): string {
  let token = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (ch === "'" && !inDoubleQuote) { inSingleQuote = !inSingleQuote; }
    else if (ch === '"' && !inSingleQuote) { inDoubleQuote = !inDoubleQuote; }
    else if (!inSingleQuote && !inDoubleQuote) {
      if (ch === ' ' || ch === '\t' || ch === ';') break;
      token += ch;
    } else { token += ch; }
  }
  return token;
}

function skipFlags(rest: string): string {
  while (rest.startsWith('-')) {
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx === -1) return '';
    const afterFlag = rest.substring(spaceIdx).trimStart();
    if (afterFlag.startsWith('-')) {
      const nextSpace = afterFlag.indexOf(' ');
      if (nextSpace === -1) break;
      rest = afterFlag.substring(nextSpace).trimStart();
    } else {
      rest = afterFlag;
      break;
    }
  }
  return rest;
}

export function dockerHasWriteArg(cmd: string): boolean {
  const rest = cmd.substring(6).trimStart();
  const subCmd = getFirstToken(skipFlags(rest));
  if (!subCmd) return false;

  // İki seviyeli alt komut kontrolü: docker {namespace} {action}
  if (DOCKER_NAMESPACE_WRITE.has(subCmd)) {
    let nsRest = skipFlags(rest.substring(subCmd.length).trimStart());
    const action = getFirstToken(nsRest);
    if (action && DOCKER_NAMESPACE_WRITE.get(subCmd)?.includes(action)) return true;
  }

  if (DOCKER_READ_ONLY.has(subCmd)) return false;
  if (DOCKER_WRITE_COMMANDS.has(subCmd)) return true;

  // docker exec özel kontrol
  if (subCmd === 'exec') {
    let execRest = skipFlags(rest.substring(subCmd.length).trimStart());
    // container adını atla
    if (execRest.startsWith('--container')) {
      const eqIdx = execRest.indexOf('=');
      if (eqIdx !== -1) execRest = execRest.substring(eqIdx + 1).trimStart();
      else {
        const spaceIdx = execRest.indexOf(' ');
        if (spaceIdx === -1) return false;
        execRest = execRest.substring(spaceIdx).trimStart();
      }
    } else {
      const spaceIdx = execRest.indexOf(' ');
      if (spaceIdx === -1) return false;
      execRest = execRest.substring(spaceIdx).trimStart();
    }
    // kalan komutu kontrol et — write pattern varsa engelle
    if (execRest) {
      const execCmd = getFirstToken(execRest);
      // exec içindeki komut whitelist'te yoksa veya write pattern varsa engelle
      // Basit yaklaşım: execRest'i checker'a ver (recursive call yerine inline check)
      // Burada sadece ilk token'ı kontrol ediyoruz, write pattern detector bunu halleder
      // exec içindeki komutun write yapması durumunda true döndür
      // execRest'te > redirection veya write pattern var mı?
      if (execRest.includes('>')) return true;
      if (/\b(rm|touch|mkdir|cp|mv|dd|truncate)\b/.test(execRest)) return true;
    }
    return false;
  }

  return true;
}
