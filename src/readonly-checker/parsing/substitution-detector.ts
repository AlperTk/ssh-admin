/** Komut substitution ($(), backtick) tespit ve recursive check tetikleme */
const SUBSTITUTION_REGEX = /\$\(.*?\)|`[^`]+`/g;

export interface SubstitutionResult {
  allowed: boolean;
  reason?: string;
}

export type CheckFn = (cmd: string) => SubstitutionResult;

/** Komut substitution içindeki komutları kontrol et */
export function checkSubstitutions(command: string, check: CheckFn): SubstitutionResult | null {
  const subMatch = command.match(SUBSTITUTION_REGEX);
  if (!subMatch) return null;

  for (const sub of subMatch) {
    const inner = sub.startsWith('$(')
      ? sub.slice(2, -1)
      : sub.slice(1, -1);
    const result = check(inner);
    if (!result.allowed) return result;
  }

  return null;
}
