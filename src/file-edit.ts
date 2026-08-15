import { Buffer } from "node:buffer";

/**
 * Pure helpers for the `file_edit` tool.
 *
 * The remote edit is performed by a single self-guarding shell command that
 * emits a machine-readable envelope (sentinel lines) so the Node side can
 * extract the match count, backup path and diff without parsing free-form
 * output. All user-supplied values are passed to the shell via base64 to make
 * quoting / special-character handling bulletproof.
 */

export interface FileEditArgs {
  path: string;
  mode: "replace" | "range";
  /** replace mode only */
  find?: string;
  all?: boolean;
  /** range mode only (1-based, inclusive) */
  startLine?: number;
  endLine?: number;
  /** both modes; empty string deletes */
  replace: string;
  dryRun?: boolean;
}

// Envelope sentinels (shared between builder and parser).
const COUNT_PREFIX = "__FILEEDIT_COUNT__ ";
const ERROR_PREFIX = "__FILEEDIT_ERROR__ ";
const BACKUP_PREFIX = "__FILEEDIT_BACKUP__ ";
const DIFF_MARKER = "__FILEEDIT_DIFF__";
const END_MARKER = "__FILEEDIT_END__";

function b64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

/** Decode a base64 value into a shell variable assignment. */
function decode(varName: string, value: string): string {
  return `${varName}=$(printf '%s' '${b64(value)}' | base64 -d)`;
}

/** Literal find -> replace via perl (\Q..\E pattern, $ENV replacement). */
const PERL_REPLACE = `FIND="$FIND" REPL="$REPL" perl -pi -e 's/\\Q$ENV{FIND}\\E/$ENV{REPL}/g'`;

function buildReplaceCommand(args: FileEditArgs): string {
  const allFlag = args.all ? "true" : "false";
  const dry = args.dryRun ? "true" : "false";
  const steps = [
    decode("P", args.path),
    decode("FIND", args.find ?? ""),
    decode("REPL", args.replace),
    `[ -f "$P" ] || { echo "${ERROR_PREFIX}File not found: $P"; exit 0; }`,
    `N=$(grep -a -o -F -- "$FIND" "$P" 2>/dev/null | wc -l)`,
    `echo "${COUNT_PREFIX}$N"`,
    `if [ "$N" -eq 0 ]; then echo "${ERROR_PREFIX}No match found for the given 'find' in $P. Nothing changed."; exit 0; fi`,
    `if [ "$N" -gt 1 ] && [ "${allFlag}" = "false" ]; then echo "${ERROR_PREFIX}$N matches found in $P. Set all=true to replace all, or make 'find' more specific."; exit 0; fi`,
    `if [ "${dry}" = "true" ]; then TMP=$(mktemp); cp "$P" "$TMP"; ${PERL_REPLACE} "$TMP"; echo "${DIFF_MARKER}"; diff -u "$P" "$TMP" || true; rm -f "$TMP"; echo "${END_MARKER}"; exit 0; fi`,
    `TS=$(date -u +%Y%m%dT%H%M%SZ); BD=$(mktemp -d); BAK="$BD/$(basename "$P").$TS"; cp -p "$P" "$BAK"`,
    `${PERL_REPLACE} "$P"`,
    `echo "${BACKUP_PREFIX}$BAK"`,
    `echo "${DIFF_MARKER}"`,
    `diff -u "$BAK" "$P" || true`,
    `echo "${END_MARKER}"`,
  ];
  return steps.join(" ; ");
}

function buildRangeCommand(args: FileEditArgs): string {
  const S = args.startLine as number;
  const E = args.endLine as number;
  const dry = args.dryRun ? "true" : "false";
  // Splice: lines[1..S-1] + replacement + lines[E+1..end]. Empty REPL => pure delete.
  const splice = `{ [ "$S" -gt 1 ] && sed "$((S-1))q" "$P"; [ -n "$REPL" ] && printf '%s\\n' "$REPL"; tail -n +"$((E+1))" "$P"; }`;
  const steps = [
    decode("P", args.path),
    decode("REPL", args.replace),
    `S=${S}`,
    `E=${E}`,
    `[ -f "$P" ] || { echo "${ERROR_PREFIX}File not found: $P"; exit 0; }`,
    `TOTAL=$(awk 'END{print NR}' "$P")`,
    `echo "${COUNT_PREFIX}$TOTAL"`,
    `if [ "$E" -gt "$TOTAL" ]; then echo "${ERROR_PREFIX}Range exceeds file length ($TOTAL lines). endLine=$E."; exit 0; fi`,
    `if [ "${dry}" = "true" ]; then TMP=$(mktemp); ${splice} > "$TMP"; echo "${DIFF_MARKER}"; diff -u "$P" "$TMP" || true; rm -f "$TMP"; echo "${END_MARKER}"; exit 0; fi`,
    `TS=$(date -u +%Y%m%dT%H%M%SZ); BD=$(mktemp -d); BAK="$BD/$(basename "$P").$TS"; cp -p "$P" "$BAK"`,
    `${splice} > "$P.tmp"`,
    `cat "$P.tmp" > "$P"`,
    `rm -f "$P.tmp"`,
    `echo "${BACKUP_PREFIX}$BAK"`,
    `echo "${DIFF_MARKER}"`,
    `diff -u "$BAK" "$P" || true`,
    `echo "${END_MARKER}"`,
  ];
  return steps.join(" ; ");
}

/** Build the self-guarding shell command that performs the edit. */
export function buildFileEditCommand(args: FileEditArgs): string {
  if (args.mode === "range") return buildRangeCommand(args);
  return buildReplaceCommand(args);
}

/** Human-readable summary for the changelog (avoids dumping base64 blobs). */
export function describeFileEdit(args: FileEditArgs): string {
  const flat = (s: string) => s.replace(/\r?\n/g, "\\n");
  if (args.mode === "range") {
    return `file_edit(range) path=${args.path} lines=${args.startLine}-${args.endLine}`;
  }
  return `file_edit(replace) path=${args.path} find='${flat(args.find ?? "")}' -> '${flat(args.replace)}' all=${args.all ? "true" : "false"}`;
}

export interface FileEditResult {
  error?: string;
  count: number;
  backup?: string;
  diff: string;
}

/** Parse the envelope emitted by the shell command into a structured result. */
export function parseFileEditOutput(stdout: string): FileEditResult {
  const result: FileEditResult = { count: 0, diff: "" };
  const diffLines: string[] = [];
  let inDiff = false;
  for (const line of stdout.split("\n")) {
    if (line.startsWith(COUNT_PREFIX)) {
      result.count = parseInt(line.slice(COUNT_PREFIX.length), 10) || 0;
      inDiff = false;
    } else if (line.startsWith(ERROR_PREFIX)) {
      result.error = line.slice(ERROR_PREFIX.length);
      inDiff = false;
    } else if (line.startsWith(BACKUP_PREFIX)) {
      result.backup = line.slice(BACKUP_PREFIX.length);
      inDiff = false;
    } else if (line === DIFF_MARKER) {
      inDiff = true;
    } else if (line === END_MARKER) {
      inDiff = false;
    } else if (inDiff) {
      diffLines.push(line);
    }
  }
  result.diff = diffLines.join("\n");
  return result;
}
