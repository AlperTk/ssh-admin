const SYSCTL_WRITE_LONG_OPTS = ['write', 'load', 'system'];

// Fail-closed: -w/-p/--system (incl. getopt prefixes and clustered short flags) and any key=value
// token (dotted or not) apply settings. Quotes are stripped as the shell would.
function isSysctlWriteToken(raw: string): boolean {
  const tok = raw.replace(/["'\\]/g, '');
  if (tok.startsWith('--')) {
    const name = tok.slice(2).split('=')[0];
    return name !== '' && SYSCTL_WRITE_LONG_OPTS.some((opt) => opt.startsWith(name));
  }
  if (tok.startsWith('-')) return /[wp]/.test(tok.slice(1)) || tok.includes('=');
  return tok.includes('=');
}

export function sysctlHasWriteArg(cmd: string): boolean {
  const rest = cmd.substring(7).trimStart();
  return rest.split(/\s+/).some(isSysctlWriteToken);
}
