import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { kpartxHasWriteArg } from "../../../src/readonly-checker/write-handlers/kpartx-handler.js";

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

describe("kpartxHasWriteArg", () => {
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
    it("allows bare kpartx", () => {
      expect(kpartxHasWriteArg("kpartx")).toBe(false);
    });

    it("allows listing with -l when no device follows", () => {
      expect(kpartxHasWriteArg("kpartx -l")).toBe(false);
    });

    it("allows --list, --verbose, --help, --version, --readonly", () => {
      expect(kpartxHasWriteArg("kpartx --list")).toBe(false);
      expect(kpartxHasWriteArg("kpartx --verbose")).toBe(false);
      expect(kpartxHasWriteArg("kpartx --help")).toBe(false);
      expect(kpartxHasWriteArg("kpartx --version")).toBe(false);
      expect(kpartxHasWriteArg("kpartx --readonly")).toBe(false);
    });

    it("allows short help/version flags", () => {
      expect(kpartxHasWriteArg("kpartx -h")).toBe(false);
      expect(kpartxHasWriteArg("kpartx -V")).toBe(false);
    });
  });

  describe("persistent writes (blocked)", () => {
    it("blocks a bare device argument (default add)", () => {
      expect(kpartxHasWriteArg("kpartx /dev/sda")).toBe(true);
    });

    it("blocks -a and -d with a device", () => {
      expect(kpartxHasWriteArg("kpartx -a /dev/sda")).toBe(true);
      expect(kpartxHasWriteArg("kpartx -d /dev/sda")).toBe(true);
    });

    it("blocks long --add and --delete with a device", () => {
      expect(kpartxHasWriteArg("kpartx --add /dev/sda")).toBe(true);
      expect(kpartxHasWriteArg("kpartx --delete /dev/sda")).toBe(true);
    });

    it("blocks write flags after other short flags", () => {
      expect(kpartxHasWriteArg("kpartx -v -a /dev/sdb")).toBe(true);
    });

    it("blocks unknown long options", () => {
      expect(kpartxHasWriteArg("kpartx --frobnicate")).toBe(true);
    });

    it("blocks bare short delete flag without device", () => {
      expect(kpartxHasWriteArg("kpartx -d")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("returns false for empty and whitespace-only input", () => {
      expect(kpartxHasWriteArg("")).toBe(false);
      expect(kpartxHasWriteArg("   ")).toBe(false);
      expect(kpartxHasWriteArg("kpartx   ")).toBe(false);
    });

    it("returns false when command name is absent", () => {
      expect(kpartxHasWriteArg("ls -l /dev/sda")).toBe(false);
    });

    it("treats device-before-flag ordering as a write", () => {
      expect(kpartxHasWriteArg("kpartx /dev/sda -l")).toBe(true);
    });

    it("treats -- as end-of-options and blocks the following token", () => {
      expect(kpartxHasWriteArg("kpartx -- -l")).toBe(true);
    });

    it("handles combined short flags", () => {
      expect(kpartxHasWriteArg("kpartx -lv")).toBe(false);
      expect(kpartxHasWriteArg("kpartx -av /dev/sda")).toBe(true);
    });

    it("tolerates extra spaces between arguments", () => {
      expect(kpartxHasWriteArg("kpartx     /dev/sda")).toBe(true);
      expect(kpartxHasWriteArg("kpartx    --list")).toBe(false);
    });

    it("matches the command name case-insensitively", () => {
      expect(kpartxHasWriteArg("KPARTX /dev/sda")).toBe(true);
      expect(kpartxHasWriteArg("Kpartx -l")).toBe(false);
    });

    it("keeps quoted read-only flags allowed", () => {
      expect(kpartxHasWriteArg('kpartx --list "/dev/sda"')).toBe(false);
    });
  });

  describe("no execution", () => {
    it("classifies without spawning or writing anything", () => {
      expect(kpartxHasWriteArg("kpartx -d /dev/sda")).toBe(true);
      expect(kpartxHasWriteArg("kpartx -l")).toBe(false);
    });
  });
});
