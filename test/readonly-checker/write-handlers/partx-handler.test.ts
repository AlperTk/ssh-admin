import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { partxHasWriteArg } from "../../../src/readonly-checker/write-handlers/partx-handler.js";

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

describe("partxHasWriteArg", () => {
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

  describe("read-only (allowed)", () => {
    it("allows --show with and without a device", () => {
      expect(partxHasWriteArg("partx --show")).toBe(false);
      expect(partxHasWriteArg("partx --show /dev/sda")).toBe(false);
    });

    it("allows --list-types and --noheadings", () => {
      expect(partxHasWriteArg("partx --list-types")).toBe(false);
      expect(partxHasWriteArg("partx --noheadings /dev/sda")).toBe(false);
    });

    it("allows output-format options such as --raw and --nr", () => {
      expect(partxHasWriteArg("partx --raw /dev/sda")).toBe(false);
      expect(partxHasWriteArg("partx --nr 1 /dev/sda")).toBe(false);
    });
  });

  describe("persistent writes (blocked)", () => {
    it("blocks a bare device argument", () => {
      expect(partxHasWriteArg("partx /dev/sda")).toBe(true);
    });

    it("blocks -a and -d with a device", () => {
      expect(partxHasWriteArg("partx -a /dev/sda")).toBe(true);
      expect(partxHasWriteArg("partx -d /dev/sda")).toBe(true);
    });

    it("blocks long --add, --delete, --update with a device", () => {
      expect(partxHasWriteArg("partx --add /dev/sda")).toBe(true);
      expect(partxHasWriteArg("partx --delete /dev/sda")).toBe(true);
      expect(partxHasWriteArg("partx --update /dev/sda")).toBe(true);
    });

    it("blocks unknown long options", () => {
      expect(partxHasWriteArg("partx --frobnicate")).toBe(true);
    });

    it("blocks bare short add flag without device", () => {
      expect(partxHasWriteArg("partx -a")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("returns false for empty and whitespace-only input", () => {
      expect(partxHasWriteArg("")).toBe(false);
      expect(partxHasWriteArg("   ")).toBe(false);
      expect(partxHasWriteArg("partx   ")).toBe(false);
    });

    it("returns false when command name is absent", () => {
      expect(partxHasWriteArg("cat --show")).toBe(false);
    });

    it("uses the first non-skipped token: write flag before read flag", () => {
      expect(partxHasWriteArg("partx --add --show")).toBe(true);
    });

    it("treats -- as end-of-options and blocks the following token", () => {
      expect(partxHasWriteArg("partx -- --show")).toBe(true);
    });

    it("tolerates extra spaces between arguments", () => {
      expect(partxHasWriteArg("partx     --add   /dev/sda")).toBe(true);
      expect(partxHasWriteArg("partx    --show")).toBe(false);
    });

    it("matches the command name case-insensitively", () => {
      expect(partxHasWriteArg("PARTX --add /dev/sda")).toBe(true);
      expect(partxHasWriteArg("PartX --show")).toBe(false);
    });
  });

  describe("no execution", () => {
    it("classifies without spawning or writing anything", () => {
      expect(partxHasWriteArg("partx --add /dev/sda")).toBe(true);
      expect(partxHasWriteArg("partx --show")).toBe(false);
    });
  });
});
