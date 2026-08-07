/** Komut satırı parsing yardımcı fonksiyonları */
export function getFirstToken(str: string): string {
  let token = '';
  let inSQ = false;
  let inDQ = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'" && !inDQ) {
      inSQ = !inSQ;
    } else if (ch === '"' && !inSQ) {
      inDQ = !inDQ;
    } else if (!inSQ && !inDQ) {
      if (ch === ' ' || ch === '\t' || ch === ';') break;
      token += ch;
    } else {
      token += ch;
    }
  }
  return token;
}

export function skipShortFlags(rest: string): string {
  while (rest.startsWith('-') && !rest.startsWith('--')) {
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx === -1) return '';
    rest = rest.substring(spaceIdx).trimStart();
  }
  return rest;
}

export function skipLongFlags(rest: string): string {
  while (rest.startsWith('--')) {
    const spaceIdx = rest.indexOf(' ');
    const eqIdx = rest.indexOf('=');
    const endIdx = eqIdx !== -1 ? eqIdx : spaceIdx;
    if (endIdx === -1) return '';
    rest = rest.substring(endIdx).trimStart();
  }
  return rest;
}

export function skipFlags(rest: string): string {
  while (rest.startsWith('-')) {
    if (rest.startsWith('--')) {
      rest = skipLongFlags(rest);
    } else {
      rest = skipShortFlags(rest);
    }
  }
  return rest;
}
