const WRITE_PATTERNS = [
  />>/,
  />\s*\//,
  />\s*\.\./,
  />\s*\.\.$/,
  /\brm\b/,
  /\btouch\b/,
  /\bmkdir\b/,
  /\bcp\b/,
  /\bmv\b/,
  /\bdd\b/,
  /\btruncate\b/,
];

export function dockerExecHasWriteArg(cmd: string): boolean {
  return WRITE_PATTERNS.some((p) => p.test(cmd));
}
