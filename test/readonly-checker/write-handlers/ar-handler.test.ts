import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { arHasWriteArg } from "../../../src/readonly-checker/write-handlers/ar-handler.js";

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

// ar has no read-only subcommand per the handler: every invocation is treated as a write.
describe("arHasWriteArg", () => {
  describe("persistent write (blocked, always)", () => {
    it("should block archive creation/update (rcs)", () => {
      expect(arHasWriteArg("ar rcs libfoo.a foo.o")).toBe(true);
    });

    it("should block archive member deletion", () => {
      expect(arHasWriteArg("ar d libfoo.a foo.o")).toBe(true);
    });

    it("should block archive member replacement", () => {
      expect(arHasWriteArg("ar r libfoo.a bar.o")).toBe(true);
    });

    it("should block listing-style invocations too (no read-only subcommand exists)", () => {
      expect(arHasWriteArg("ar t libfoo.a")).toBe(true);
      expect(arHasWriteArg("ar -t libfoo.a")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should block bare ar with no arguments", () => {
      expect(arHasWriteArg("ar")).toBe(true);
    });

    it("should block empty input", () => {
      expect(arHasWriteArg("")).toBe(true);
    });

    it("should block with quoted archive path", () => {
      expect(arHasWriteArg("ar rcs 'my lib.a' 'my obj.o'")).toBe(true);
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

    it("classifies without spawning or writing anything", () => {
      expect(arHasWriteArg("ar rcs libfoo.a foo.o")).toBe(true);
    });
  });
});
