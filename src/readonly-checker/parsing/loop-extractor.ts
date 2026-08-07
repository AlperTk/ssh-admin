/** for döngüsü gövdesini çıkar */
function findMatchingDone(content: string): number {
  let depth = 1;
  let i = 0;
  while (i < content.length) {
    if (content[i] === "'") {
      let j = i + 1;
      while (j < content.length && content[j] !== "'") j++;
      i = j + 1;
      continue;
    }
    if (content[i] === '"') {
      let j = i + 1;
      while (j < content.length && content[j] !== '"') j++;
      i = j + 1;
      continue;
    }
    if (content[i] === '\\') { i += 2; continue; }
    if (content.substring(i, i + 5) === 'done' &&
        (i + 5 >= content.length || !/\w/.test(content[i + 5])) &&
        (i === 0 || !/\w/.test(content[i - 1]))) {
      depth--;
      if (depth === 0) return i;
      i += 5;
      continue;
    }
    if (content.substring(i, i + 2) === 'do' &&
        (i + 2 >= content.length || !/\w/.test(content[i + 2])) &&
        (i === 0 || !/\w/.test(content[i - 1]))) {
      depth++;
      i += 2;
      continue;
    }
    i++;
  }
  return -1;
}

/** Loop body extraction — for/while döngülerinin gövdesini çıkarır */
export function extractLoopBody(segment: string): string | null {
  const trimmed = segment.trim();

  // for var in ... ; do ... ; done
  const forMatch = trimmed.match(/^for\s+\S+(\s+in\s+.+?)?\s*;?\s*do\s+(.+)$/s);
  if (forMatch) {
    const body = forMatch[2];
    const doneIdx = findMatchingDone(body);
    if (doneIdx !== -1) return body.substring(0, doneIdx).trim();
  }

  // while condition ; do ... ; done
  const whileMatch = trimmed.match(/^while\s+.+?\s*;?\s*do\s+(.+)$/s);
  if (whileMatch) {
    const body = whileMatch[1];
    const doneIdx = findMatchingDone(body);
    if (doneIdx !== -1) return body.substring(0, doneIdx).trim();
  }

  return null;
}
