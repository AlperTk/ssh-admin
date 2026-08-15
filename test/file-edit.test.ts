import { describe, it, expect } from "vitest";
import { Buffer } from "node:buffer";
import {
  buildFileEditCommand,
  describeFileEdit,
  parseFileEditOutput,
  type FileEditArgs,
} from "../src/file-edit.js";

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

describe("buildFileEditCommand (replace mode)", () => {
  const base: FileEditArgs = {
    path: "/etc/nginx/nginx.conf",
    mode: "replace",
    find: "listen 80;",
    replace: "listen 8080;",
  };

  it("passes path/find/replace via base64", () => {
    const cmd = buildFileEditCommand(base);
    expect(cmd).toContain(b64("/etc/nginx/nginx.conf"));
    expect(cmd).toContain(b64("listen 80;"));
    expect(cmd).toContain(b64("listen 8080;"));
    expect(cmd).toContain("base64 -d");
  });

  it("uses perl literal replace with \\Q..\\E and $ENV", () => {
    const cmd = buildFileEditCommand(base);
    expect(cmd).toContain("perl -pi -e");
    expect(cmd).toContain("\\Q$ENV{FIND}\\E");
    expect(cmd).toContain("$ENV{REPL}");
  });

  it("emits count / diff / end sentinels", () => {
    const cmd = buildFileEditCommand(base);
    expect(cmd).toContain("__FILEEDIT_COUNT__");
    expect(cmd).toContain("__FILEEDIT_DIFF__");
    expect(cmd).toContain("__FILEEDIT_END__");
  });

  it("guards against zero matches", () => {
    const cmd = buildFileEditCommand(base);
    expect(cmd).toContain('[ "$N" -eq 0 ]');
    expect(cmd).toContain("No match found");
  });

  it("guards against multiple matches when all=false", () => {
    const cmd = buildFileEditCommand({ ...base, all: false });
    expect(cmd).toContain('[ "$N" -gt 1 ]');
    expect(cmd).toContain('"false" = "false"');
    expect(cmd).toContain("Set all=true to replace all");
  });

  it("creates a backup in a temp dir before applying (non-dryRun)", () => {
    const cmd = buildFileEditCommand({ ...base, dryRun: false });
    expect(cmd).toContain("BD=$(mktemp -d)");
    expect(cmd).toContain('BAK="$BD/$(basename "$P").$TS"');
    expect(cmd).toContain("cp -p \"$P\" \"$BAK\"");
    expect(cmd).toContain("__FILEEDIT_BACKUP__");
  });

  it("dryRun previews to a temp file and exits before applying", () => {
    const cmd = buildFileEditCommand({ ...base, dryRun: true });
    expect(cmd).toContain('if [ "true" = "true" ]');
    expect(cmd).toContain("TMP=$(mktemp)");
    expect(cmd).toContain('cp "$P" "$TMP"');
    expect(cmd).toContain('diff -u "$P" "$TMP"');
    // The dryRun branch terminates before the backup/apply steps run.
    expect(cmd.indexOf("exit 0")).toBeLessThan(cmd.indexOf("BD=$(mktemp -d)"));
  });
});

describe("buildFileEditCommand (range mode)", () => {
  const base: FileEditArgs = {
    path: "/etc/nginx/nginx.conf",
    mode: "range",
    startLine: 42,
    endLine: 71,
    replace: "server {\n    listen 8080;\n}",
  };

  it("sets S and E from the range", () => {
    const cmd = buildFileEditCommand(base);
    expect(cmd).toContain("S=42");
    expect(cmd).toContain("E=71");
  });

  it("passes replacement via base64", () => {
    const cmd = buildFileEditCommand(base);
    expect(cmd).toContain(b64("server {\n    listen 8080;\n}"));
  });

  it("splices with sed head + tail and preserves inode via cat", () => {
    const cmd = buildFileEditCommand(base);
    expect(cmd).toContain('sed "$((S-1))q" "$P"');
    expect(cmd).toContain('tail -n +"$((E+1))" "$P"');
    expect(cmd).toContain('cat "$P.tmp" > "$P"');
  });

  it("counts total lines with awk and guards range overflow", () => {
    const cmd = buildFileEditCommand(base);
    expect(cmd).toContain("awk 'END{print NR}'");
    expect(cmd).toContain('[ "$E" -gt "$TOTAL" ]');
    expect(cmd).toContain("Range exceeds file length");
  });

  it("skips the printf when replacement is empty (pure delete)", () => {
    const cmd = buildFileEditCommand({ ...base, replace: "" });
    expect(cmd).toContain('[ -n "$REPL" ] && printf');
  });
});

describe("describeFileEdit", () => {
  it("produces a readable replace summary", () => {
    const s = describeFileEdit({
      path: "/etc/nginx/nginx.conf",
      mode: "replace",
      find: "listen 80;",
      replace: "listen 8080;",
      all: true,
    });
    expect(s).toBe("file_edit(replace) path=/etc/nginx/nginx.conf find='listen 80;' -> 'listen 8080;' all=true");
  });

  it("flattens newlines in the summary", () => {
    const s = describeFileEdit({
      path: "/x",
      mode: "replace",
      find: "a",
      replace: "line1\nline2",
    });
    expect(s).toContain("line1\\nline2");
    expect(s).not.toContain("line1\nline2");
  });

  it("produces a readable range summary", () => {
    const s = describeFileEdit({
      path: "/etc/hosts",
      mode: "range",
      startLine: 3,
      endLine: 9,
      replace: "new",
    });
    expect(s).toBe("file_edit(range) path=/etc/hosts lines=3-9");
  });
});

describe("parseFileEditOutput", () => {
  it("parses a successful apply envelope", () => {
    const stdout = [
      "__FILEEDIT_COUNT__ 1",
      "__FILEEDIT_BACKUP__ /etc/nginx/nginx.conf.bak.20260815T191905Z",
      "__FILEEDIT_DIFF__",
      "--- a",
      "+++ b",
      "-listen 80;",
      "+listen 8080;",
      "__FILEEDIT_END__",
    ].join("\n");
    const r = parseFileEditOutput(stdout);
    expect(r.error).toBeUndefined();
    expect(r.count).toBe(1);
    expect(r.backup).toBe("/etc/nginx/nginx.conf.bak.20260815T191905Z");
    expect(r.diff).toContain("-listen 80;");
    expect(r.diff).toContain("+listen 8080;");
  });

  it("parses a zero-match error envelope", () => {
    const stdout = ["__FILEEDIT_COUNT__ 0", "__FILEEDIT_ERROR__ No match found for the given 'find' in /x. Nothing changed."].join("\n");
    const r = parseFileEditOutput(stdout);
    expect(r.count).toBe(0);
    expect(r.error).toContain("No match found");
    expect(r.backup).toBeUndefined();
  });

  it("parses a multiple-match error envelope", () => {
    const stdout = ["__FILEEDIT_COUNT__ 3", "__FILEEDIT_ERROR__ 3 matches found in /x. Set all=true to replace all, or make 'find' more specific."].join("\n");
    const r = parseFileEditOutput(stdout);
    expect(r.count).toBe(3);
    expect(r.error).toContain("Set all=true");
  });

  it("parses a dryRun envelope (diff, no backup)", () => {
    const stdout = ["__FILEEDIT_COUNT__ 1", "__FILEEDIT_DIFF__", "-old", "+new", "__FILEEDIT_END__"].join("\n");
    const r = parseFileEditOutput(stdout);
    expect(r.error).toBeUndefined();
    expect(r.backup).toBeUndefined();
    expect(r.diff).toBe("-old\n+new");
  });

  it("ignores lines outside the diff block", () => {
    const stdout = ["noise before", "__FILEEDIT_DIFF__", "a", "b", "__FILEEDIT_END__", "noise after"].join("\n");
    const r = parseFileEditOutput(stdout);
    expect(r.diff).toBe("a\nb");
  });
});
