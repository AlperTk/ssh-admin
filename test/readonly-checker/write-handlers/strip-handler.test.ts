import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { stripHasWriteArg } from "../../../src/readonly-checker/write-handlers/strip-handler.js";

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

// strip has no read-only path: stripHasWriteArg always returns true.
describe("stripHasWriteArg", () => {
  afterEach(() => {
    expect(childProcess.exec).not.toHaveBeenCalled();
    expect(childProcess.execFile).not.toHaveBeenCalled();
    expect(childProcess.execSync).not.toHaveBeenCalled();
    expect(childProcess.execFileSync).not.toHaveBeenCalled();
    expect(childProcess.spawn).not.toHaveBeenCalled();
    expect(childProcess.spawnSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(fs.appendFileSync).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(fs.appendFile).not.toHaveBeenCalled();
  });

  describe("persistent writes (blocked)", () => {
    it("should block strip on a binary", () => {
      expect(stripHasWriteArg("strip a.out")).toBe(true);
    });

    it("should block strip with long options", () => {
      expect(stripHasWriteArg("strip --strip-all app")).toBe(true);
    });

    it("should block strip with short options", () => {
      expect(stripHasWriteArg("strip -s libfoo.so")).toBe(true);
    });

    it("should block strip with multiple files", () => {
      expect(stripHasWriteArg("strip -o out.bin in.bin")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should block bare strip", () => {
      expect(stripHasWriteArg("strip")).toBe(true);
    });

    it("should block strip with surrounding whitespace", () => {
      expect(stripHasWriteArg("  strip   a.out  ")).toBe(true);
    });

    it("should block empty input (no read-only path)", () => {
      expect(stripHasWriteArg("")).toBe(true);
    });
  });
});
