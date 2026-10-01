import { getFirstToken } from '../../tokenizer.js';

/** Komut satırı parsing yardımcı fonksiyonları */
export { getFirstToken };

export function skipShortFlags(rest: string): string {
  while (rest.startsWith('-') && !rest.startsWith('--')) {
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx === -1) return '';
    rest = rest.substring(spaceIdx).trimStart();
  }
  return rest;
}

export function skipFlags(rest: string): string {
  while (rest.startsWith('-')) {
    if (rest.startsWith('--')) {
      while (rest.startsWith('--')) {
        const spaceIdx = rest.indexOf(' ');
        const eqIdx = rest.indexOf('=');
        const endIdx = eqIdx !== -1 ? eqIdx : spaceIdx;
        if (endIdx === -1) return '';
        rest = rest.substring(endIdx).trimStart();
      }
    } else {
      rest = skipShortFlags(rest);
    }
  }
  return rest;
}

/** Checks whether a string value is present in a readonly list of strings. */
export function isInReadonlyList(list: readonly string[], value: string): boolean {
  return list.includes(value);
}
