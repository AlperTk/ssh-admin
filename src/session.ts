const SESSION_ID_RE = /^[a-zA-Z0-9_-]+-[0-9a-f]{8}$/i;

export function isValidSessionId(id: string): boolean {
  return SESSION_ID_RE.test(id);
}
