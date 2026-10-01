/**
 * Builds the shell command used to discover the structure of a server's
 * `~/server-info` directory tree (two levels deep, rendered as a tree).
 */
export function buildDiscoveryCommand(): string {
  return `(cd ~/server-info && echo "$(pwd)" && find . -mindepth 1 -maxdepth 2 | sed -e "s/[^-][^\\/]*\\//  |/g" -e "s/|\\([^ ]\\)/|-- \\1/")`;
}
