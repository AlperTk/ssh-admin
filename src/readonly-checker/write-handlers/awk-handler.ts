import { AWK_WRITE_PATTERNS } from '../../data/readonly-rules.js';

export function awkHasWriteArg(cmd: string): boolean {
  const rest = cmd.substring(4).trimStart();
  
  let inSingleQuote = false;
  let program = '';
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i];
    if (ch === "'" ) { inSingleQuote = !inSingleQuote; }
    else if (ch === '"' && !inSingleQuote) { /* skip */ }
    else if (inSingleQuote) { program += ch; }
    else if (!inSingleQuote) {
      if (ch === ' ' || ch === '\t' || ch === ';') break;
    }
  }

  for (const pattern of AWK_WRITE_PATTERNS) {
    if (pattern.test(program)) return true;
  }

  return false;
}
