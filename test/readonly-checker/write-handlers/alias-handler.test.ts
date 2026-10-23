import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { aliasHasWriteArg } from "../../../src/readonly-checker/write-handlers/alias-handler.js";

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

describe("aliasHasWriteArg", () => {
  describe("read-only (allowed)", () => {
    it("should allow bare alias (lists aliases)", () => {
      expect(aliasHasWriteArg("alias")).toBe(false);
    });

    it("should allow bare alias with surrounding whitespace", () => {
      expect(aliasHasWriteArg("  alias  ")).toBe(false);
      expect(aliasHasWriteArg("alias\t")).toBe(false);
    });
  });

  describe("persistent write (blocked)", () => {
    it("should block alias definition with quoted value", () => {
      expect(aliasHasWriteArg("alias ll='ls -l'")).toBe(true);
    });

    it("should block alias definition without quotes", () => {
      expect(aliasHasWriteArg("alias foo=bar")).toBe(true);
    });

    it("should block alias with spaces inside quoted definition", () => {
      expect(aliasHasWriteArg("alias rm='rm -i'")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should treat empty input as non-bare (write) since it is not exactly 'alias'", () => {
      expect(aliasHasWriteArg("")).toBe(true);
    });

    it("should treat any extra argument after alias as write, even with trailing spaces", () => {
      expect(aliasHasWriteArg("alias   x=1   ")).toBe(true);
    });

    it("should treat a quoted name after alias as write", () => {
      expect(aliasHasWriteArg("alias 'x'")).toBe(true);
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
      expect(aliasHasWriteArg("alias")).toBe(false);
      expect(aliasHasWriteArg("alias ll='ls -l'")).toBe(true);
    });
  });
});
