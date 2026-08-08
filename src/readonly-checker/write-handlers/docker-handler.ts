import { DOCKER_READ_ONLY, DOCKER_NAMESPACE_ACTIONS } from '../../data/readonly-rules.js';
import { getFirstToken, skipFlags } from './base-handler.js';
import { dockerExecHasWriteArg } from './docker-exec-checker.js';

export function dockerHasWriteArg(cmd: string): boolean {
  const rest = cmd.substring(6).trimStart();
  // docker --version gibi sadece flag içeren komutlar read-only
  const afterFlags = skipFlags(rest);
  const trimmedAfterFlags = afterFlags.trim();
  if (!trimmedAfterFlags || trimmedAfterFlags.match(/^[\s]*[>|&]/)) {
    return false;
  }
  const subCmd = getFirstToken(trimmedAfterFlags);
  if (!subCmd) return false;

  // İki seviyeli alt komut kontrolü: docker {namespace} {action}
  if (DOCKER_NAMESPACE_ACTIONS.has(subCmd)) {
    let nsRest = skipFlags(rest.substring(subCmd.length).trimStart());
    const action = getFirstToken(nsRest);
    if (action && DOCKER_NAMESPACE_ACTIONS.get(subCmd)?.includes(action)) return true;
  }

  // Whitelist: sadece DOCKER_READ_ONLY izinli
  if (DOCKER_READ_ONLY.has(subCmd)) return false;

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
      // execRest'te write pattern var mı?
      if (execRest && dockerExecHasWriteArg(execRest)) return true;
    }
    return false;
  }

  return true;
}
