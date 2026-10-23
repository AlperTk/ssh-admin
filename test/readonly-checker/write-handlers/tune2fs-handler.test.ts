import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { tune2fsHasWriteArg } from "../../../src/readonly-checker/write-handlers/tune2fs-handler.js";

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

describe("tune2fsHasWriteArg", () => {
  describe("read-only (allowed)", () => {
    it("should allow -l (list superblock) on a device", () => {
      expect(tune2fsHasWriteArg("tune2fs -l /dev/sda1")).toBe(false);
    });

    it("should allow bare -l", () => {
      expect(tune2fsHasWriteArg("tune2fs -l")).toBe(false);
    });

    it("should allow -l with trailing whitespace", () => {
      expect(tune2fsHasWriteArg("tune2fs -l   ")).toBe(false);
    });

    it("should allow repeated read-only -l flags", () => {
      expect(tune2fsHasWriteArg("tune2fs -l -l /dev/sda1")).toBe(false);
    });

    it("should match the command name case-insensitively", () => {
      expect(tune2fsHasWriteArg("TUNE2FS -l /dev/sda1")).toBe(false);
    });
  });

  describe("persistent write (blocked)", () => {
    it("should block -c (max mount count) change", () => {
      expect(tune2fsHasWriteArg("tune2fs -c 30 /dev/sda1")).toBe(true);
    });

    it("should block -O (feature toggle)", () => {
      expect(tune2fsHasWriteArg("tune2fs -O ^has_journal /dev/sda1")).toBe(true);
    });

    it("should block -e (error behavior)", () => {
      expect(tune2fsHasWriteArg("tune2fs -e remount-ro /dev/sda1")).toBe(true);
    });

    it("should block -L (label change)", () => {
      expect(tune2fsHasWriteArg("tune2fs -L newlabel /dev/sda1")).toBe(true);
    });

    it("should block -Q (quota change)", () => {
      expect(tune2fsHasWriteArg("tune2fs -Q usrquota /dev/sda1")).toBe(true);
    });

    it("should block a write flag placed after a read-only flag", () => {
      expect(tune2fsHasWriteArg("tune2fs -l -c 30 /dev/sda1")).toBe(true);
    });

    it("should block a read-only flag placed after a write flag", () => {
      expect(tune2fsHasWriteArg("tune2fs -c 30 -l /dev/sda1")).toBe(true);
    });

    it("should block a write flag without a following space", () => {
      expect(tune2fsHasWriteArg("tune2fs -c")).toBe(true);
    });

    it("should block a write flag separated by tab", () => {
      expect(tune2fsHasWriteArg("tune2fs\t-c 30 /dev/sda1")).toBe(true);
    });

    it("should block a write flag with extra spaces", () => {
      expect(tune2fsHasWriteArg("tune2fs    -c    30    /dev/sda1")).toBe(true);
    });

    it("should block a write flag when the command name is uppercase", () => {
      expect(tune2fsHasWriteArg("TUNE2FS -c 30 /dev/sda1")).toBe(true);
    });

    it("should block an unknown long option (long options are writes unless listed)", () => {
      expect(tune2fsHasWriteArg("tune2fs --anything /dev/sda1")).toBe(true);
    });

    it("should block a write flag placed after the device argument", () => {
      expect(tune2fsHasWriteArg("tune2fs /dev/sda1 -c 30")).toBe(true);
    });

    it("should block a write flag after the device when a read-only flag precedes it", () => {
      expect(tune2fsHasWriteArg("tune2fs -l /dev/sda1 -c 30")).toBe(true);
    });

    it("should block a write flag after the device with extra spaces", () => {
      expect(tune2fsHasWriteArg("tune2fs /dev/sda1    -O    ^has_journal")).toBe(true);
    });

    it("should block a long option placed after the device", () => {
      expect(tune2fsHasWriteArg("tune2fs /dev/sda1 --help")).toBe(true);
    });

    it("should block a combined short flag placed after the device", () => {
      expect(tune2fsHasWriteArg("tune2fs /dev/sda1 -lc")).toBe(true);
    });

    it("should keep a read-only flag placed after the device allowed", () => {
      expect(tune2fsHasWriteArg("tune2fs /dev/sda1 -l")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should return false for empty input", () => {
      expect(tune2fsHasWriteArg("")).toBe(false);
    });

    it("should return false for whitespace-only input", () => {
      expect(tune2fsHasWriteArg("   ")).toBe(false);
    });

    it("should return false for a bare tune2fs with no arguments", () => {
      expect(tune2fsHasWriteArg("tune2fs")).toBe(false);
      expect(tune2fsHasWriteArg("tune2fs   ")).toBe(false);
    });

    it("should return false for a different command", () => {
      expect(tune2fsHasWriteArg("fsck -y /dev/sda1")).toBe(false);
    });

    it("should return false for a device with no flags", () => {
      expect(tune2fsHasWriteArg("tune2fs /dev/sda1")).toBe(false);
    });

    it("should treat a long option as write (conservative; --help is not in the read-only set)", () => {
      expect(tune2fsHasWriteArg("tune2fs --help")).toBe(true);
    });

    it("should treat '--' end-of-options marker as write", () => {
      expect(tune2fsHasWriteArg("tune2fs -- /dev/sda1")).toBe(true);
    });

    it("should treat combined short flags as unsafe unless the combined token is read-only", () => {
      expect(tune2fsHasWriteArg("tune2fs -lc /dev/sda1")).toBe(true);
      expect(tune2fsHasWriteArg("tune2fs -l -lc /dev/sda1")).toBe(true);
    });

    it("should treat attached short-flag value as unsafe", () => {
      expect(tune2fsHasWriteArg("tune2fs -c5 /dev/sda1")).toBe(true);
    });

    it("SECURITY GAP: single-quoted write flag is not detected (returns false)", () => {
      // Finding: when the flag is quoted, the leading-'-' loop is skipped and getFirstToken
      // strips quotes, yet the short-flag branch returns false. Shell would run `tune2fs -c 30`.
      expect(tune2fsHasWriteArg("tune2fs '-c' 30 /dev/sda1")).toBe(true);
    });

    it("SECURITY GAP: double-quoted write flag is not detected (returns false)", () => {
      // Finding: same as above with double quotes around -O.
      expect(tune2fsHasWriteArg('tune2fs "-O" ^has_journal /dev/sda1')).toBe(true);
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
      expect(tune2fsHasWriteArg("tune2fs -l /dev/sda1")).toBe(false);
      expect(tune2fsHasWriteArg("tune2fs -c 30 /dev/sda1")).toBe(true);
    });
  });
});
