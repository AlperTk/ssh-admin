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

const SHELL_SPAWN_PATTERNS = [
  /\bbash\b/,
  /\bsh\b/,
  /\bzsh\b/,
  /\bcsh\b/,
  /\bksh\b/,
  /\bfish\b/,
  /\/bin\/(ba)?sh\b/,
  /\/usr\/(s)?bin\/(ba)?sh\b/,
];

export function dockerExecHasWriteArg(cmd: string): boolean {
  if (SHELL_SPAWN_PATTERNS.some((p) => p.test(cmd))) return true;
  return WRITE_PATTERNS.some((p) => p.test(cmd));
}
