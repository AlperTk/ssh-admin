import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { awkHasWriteArg } from "../../../src/readonly-checker/write-handlers/awk-handler.js";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    exec: vi.fn(),
    execFile: vi.fn(),
    execSync: vi.fn(),
    execFileSync: vi.fn(),
    spawn: vi.fn(),
    spawnSync: vi.fn(),
  };
});

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    writeFileSync: vi.fn(),
    appendFileSync: vi.fn(),
    writeFile: vi.fn(),
    appendFile: vi.fn(),
  };
});

describe("awkHasWriteArg", () => {
  describe("read-only (allowed)", () => {
    it("should allow print of fields from a single-quoted program", () => {
      expect(awkHasWriteArg("awk '{print $2, $1}' /etc/passwd")).toBe(false);
    });

    it("should allow length() filter", () => {
      expect(awkHasWriteArg("awk 'length($0) > 80' file.txt")).toBe(false);
    });

    it("should allow END block with print", () => {
      expect(awkHasWriteArg("awk '{ sum += $1 } END { print sum }' data.txt")).toBe(false);
    });

    it("should allow an empty single-quoted program", () => {
      expect(awkHasWriteArg("awk ''")).toBe(false);
      expect(awkHasWriteArg("awk '   '")).toBe(false);
    });

    it("should allow bare awk with no program", () => {
      expect(awkHasWriteArg("awk")).toBe(false);
    });
  });

  describe("persistent write (blocked)", () => {
    it("should block system() call inside BEGIN", () => {
      expect(awkHasWriteArg("awk 'BEGIN{system(\"rm -f /tmp/x\")}'")).toBe(true);
    });

    it("should block system() even when a safe print is also present", () => {
      expect(awkHasWriteArg("awk 'BEGIN{print 1; system(\"id\")}'")).toBe(true);
    });

    it("should block piping output to a quoted command", () => {
      expect(awkHasWriteArg("awk '{print $1 | \"sh\"}' file")).toBe(true);
      expect(awkHasWriteArg("awk '{print $1 | \"sort\"}' file")).toBe(true);
    });

    it("should block unknown/unsafe program text with no safe pattern", () => {
      expect(awkHasWriteArg("awk '{x = 1}' file")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should treat program with only leading whitespace inside quotes as empty", () => {
      expect(awkHasWriteArg("awk '\t'")).toBe(false);
    });

    it("should ignore trailing arguments after the closing quote", () => {
      expect(awkHasWriteArg("awk '{print $1}' a.txt b.txt")).toBe(false);
    });

    it("should inspect the whole quoted program even with spaces inside", () => {
      expect(awkHasWriteArg("awk 'BEGIN { system(\"id\") }'")).toBe(true);
    });
  });

  describe("options before program (blocked when write construct present)", () => {
    it("should block system() when an option precedes the program", () => {
      expect(awkHasWriteArg("awk -v x=1 'BEGIN{system(\"id\")}'")).toBe(true);
    });

    it("should block a redirect hidden behind a `}` inside a string", () => {
      expect(awkHasWriteArg("awk -F: 'BEGIN{print \"}\" > \"/tmp/x\"}' file")).toBe(true);
    });

    it("should block piping to a command when an option precedes the program", () => {
      expect(awkHasWriteArg("awk -v x=1 '{print $1 | \"sh\"}' file")).toBe(true);
    });

    it("should still allow a read-only program when an option precedes it", () => {
      expect(awkHasWriteArg("awk -F: '{print $1}' /etc/passwd")).toBe(false);
      expect(awkHasWriteArg("awk -v n=2 'BEGIN{print n}'")).toBe(false);
    });
  });

  describe("new write paths (blocked)", () => {
    it("should block -f and --file program files", () => {
      expect(awkHasWriteArg("awk -f prog.awk file")).toBe(true);
      expect(awkHasWriteArg("awk --file=prog.awk file")).toBe(true);
    });

    it("should block system( anywhere in the command", () => {
      expect(awkHasWriteArg("awk 'BEGIN{system(\"id\")}'")).toBe(true);
    });

    it("should block print/printf redirects with > and >>", () => {
      expect(awkHasWriteArg("awk '{print $1 > \"/tmp/out\"}' file")).toBe(true);
      expect(awkHasWriteArg("awk '{print $1 >> \"/tmp/out\"}' file")).toBe(true);
      expect(awkHasWriteArg("awk 'BEGIN{printf(\"x\") > \"/tmp/out\"}'")).toBe(true);
    });

    it("should block print and printf piped to a command", () => {
      expect(awkHasWriteArg("awk 'BEGIN{print \"}\" | \"sh\"}'")).toBe(true);
      expect(awkHasWriteArg("awk 'BEGIN{printf(\"x\\n\") | \"sh\"}'")).toBe(true);
    });

    it("should block \"cmd\" | getline and \"cmd\" |& getline", () => {
      expect(awkHasWriteArg("awk 'BEGIN{while((\"id\" | getline l)>0) print l}'")).toBe(true);
      expect(awkHasWriteArg("awk 'BEGIN{\"id\" |& getline l; print l}'")).toBe(true);
    });

    it("should block getline < quoted file", () => {
      expect(awkHasWriteArg("awk 'BEGIN{while((getline l < \"/etc/passwd\")>0) print l}'")).toBe(true);
    });

    it("should allow read-only forms with comparisons and no output redirect", () => {
      expect(awkHasWriteArg("awk -F, 'NR>1 {sum+=$2} END {print sum}' data.csv")).toBe(false);
      expect(awkHasWriteArg("awk '{print $1}' a.txt")).toBe(false);
    });
  });

  describe("no-execution guard", () => {
    afterEach(() => {
      expect(childProcess.exec).not.toHaveBeenCalled();
      expect(childProcess.execFile).not.toHaveBeenCalled();
      expect(childProcess.execSync).not.toHaveBeenCalled();
      expect(childProcess.execFileSync).not.toHaveBeenCalled();
      expect(childProcess.spawn).not.toHaveBeenCalled();
      expect(childProcess.spawnSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(fs.appendFileSync).not.toHaveBeenCalled();
    });

    it("classifies system() payloads without executing them", () => {
      expect(awkHasWriteArg("awk 'BEGIN{system(\"rm -rf /tmp/x\")}'")).toBe(true);
    });
  });
});
