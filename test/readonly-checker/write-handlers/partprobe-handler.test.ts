import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { partprobeHasWriteArg } from "../../../src/readonly-checker/write-handlers/partprobe-handler.js";

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

describe("partprobeHasWriteArg", () => {
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
    it("allows -s and --summary", () => {
      expect(partprobeHasWriteArg("partprobe -s")).toBe(false);
      expect(partprobeHasWriteArg("partprobe --summary")).toBe(false);
    });

    it("allows -d and --dry-run", () => {
      expect(partprobeHasWriteArg("partprobe -d")).toBe(false);
      expect(partprobeHasWriteArg("partprobe --dry-run")).toBe(false);
    });

    it("allows -h, --help, -V, --version", () => {
      expect(partprobeHasWriteArg("partprobe -h")).toBe(false);
      expect(partprobeHasWriteArg("partprobe --help")).toBe(false);
      expect(partprobeHasWriteArg("partprobe -V")).toBe(false);
      expect(partprobeHasWriteArg("partprobe --version")).toBe(false);
    });
  });

  describe("persistent writes (blocked)", () => {
    it("blocks a device argument (re-read partition table)", () => {
      expect(partprobeHasWriteArg("partprobe /dev/sda")).toBe(true);
    });

    it("blocks a device argument after a short flag", () => {
      expect(partprobeHasWriteArg("partprobe -a /dev/sda")).toBe(true);
    });

    it("blocks unknown long options", () => {
      expect(partprobeHasWriteArg("partprobe --frobnicate")).toBe(true);
    });

    it("blocks bare partprobe", () => {
      expect(partprobeHasWriteArg("partprobe")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("returns false for empty and whitespace-only input", () => {
      expect(partprobeHasWriteArg("")).toBe(false);
      expect(partprobeHasWriteArg("   ")).toBe(false);
    });

    it("returns false when command name is absent", () => {
      expect(partprobeHasWriteArg("ls --summary")).toBe(false);
    });

    it("treats device-before-flag ordering as a write", () => {
      expect(partprobeHasWriteArg("partprobe /dev/sda --summary")).toBe(true);
    });

    it("treats -- as end-of-options and blocks the following token", () => {
      expect(partprobeHasWriteArg("partprobe -- /dev/sda")).toBe(true);
      expect(partprobeHasWriteArg("partprobe -- --summary")).toBe(true);
    });

    it("handles combined short flags", () => {
      expect(partprobeHasWriteArg("partprobe -sd")).toBe(false);
      expect(partprobeHasWriteArg("partprobe -ds /dev/sda")).toBe(true);
    });

    it("tolerates extra spaces between arguments", () => {
      expect(partprobeHasWriteArg("partprobe     --summary")).toBe(false);
      expect(partprobeHasWriteArg("partprobe    /dev/sda")).toBe(true);
    });

    it("matches the command name case-insensitively", () => {
      expect(partprobeHasWriteArg("PARTPROBE /dev/sda")).toBe(true);
      expect(partprobeHasWriteArg("PartProbe --summary")).toBe(false);
    });
  });

  describe("no execution", () => {
    it("classifies without spawning or writing anything", () => {
      expect(partprobeHasWriteArg("partprobe /dev/sda")).toBe(true);
      expect(partprobeHasWriteArg("partprobe -s")).toBe(false);
    });
  });
});
