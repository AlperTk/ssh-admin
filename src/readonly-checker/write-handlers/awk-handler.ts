import { AWK_SAFE_PATTERNS } from '../../data/readonly-rules.js';

// Checked against the whole command: these constructs can appear outside the quoted program too.
const AWK_WRITE_PATTERNS: RegExp[] = [
  /\bsystem\s*\(/, // command execution
  /\bprintf?\b[\s\S]*?(>|\|)/, // print > file, print >> file, print | cmd (also when `}`/`;` sit inside strings)
  /\|&?\s*getline\b/, // "cmd" | getline, "cmd" |& getline
  /\bgetline\b[^|]*<\s*["']/, // getline < "cmd"
];

export function awkHasWriteArg(cmd: string): boolean {
  // -f/--file: program text lives in a file that cannot be inspected → fail closed
  if (/(^|\s)(-f|--file)/.test(cmd)) return true;
  if (AWK_WRITE_PATTERNS.some((pattern) => pattern.test(cmd))) return true;

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

  // Whitelist: sadece SAFE_PATTERNS listesindeki pattern'lar izinli
  if (!program.trim()) return false;
  for (const pattern of AWK_SAFE_PATTERNS) {
    if (pattern.test(program)) return false;
  }
  return true;
}
