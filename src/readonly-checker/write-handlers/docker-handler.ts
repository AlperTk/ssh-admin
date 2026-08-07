import { DOCKER_READ_ONLY, DOCKER_NAMESPACE_WRITE } from '../../data/readonly-rules.js';
import { getFirstToken, skipShortFlags } from '../resolution/command-resolver.js';
import { dockerExecHasWriteArg } from './docker-exec-checker.js';

export function dockerHasWriteArg(cmd: string): boolean {
  const rest = cmd.substring(6).trimStart();
  const subCmd = getFirstToken(skipDockerFlags(rest));
  if (!subCmd) return false;

  // İki seviyeli alt komut kontrolü: docker {namespace} {action}
  if (DOCKER_NAMESPACE_WRITE.has(subCmd)) {
    let nsRest = skipDockerFlags(rest.substring(subCmd.length).trimStart());
    const action = getFirstToken(nsRest);
    if (action && DOCKER_NAMESPACE_WRITE.get(subCmd)?.includes(action)) return true;
  }

  // Whitelist: sadece DOCKER_READ_ONLY izinli
  if (DOCKER_READ_ONLY.has(subCmd)) return false;

  // docker exec özel kontrol
  if (subCmd === 'exec') {
    let execRest = skipDockerFlags(rest.substring(subCmd.length).trimStart());
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

function skipDockerFlags(rest: string): string {
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
