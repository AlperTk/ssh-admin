import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { dmsetupHasWriteArg } from "../../../src/readonly-checker/write-handlers/dmsetup-handler.js";

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

describe("dmsetupHasWriteArg", () => {
  describe("read-only (allowed)", () => {
    it("should allow listing and inspection subcommands", () => {
      expect(dmsetupHasWriteArg("dmsetup ls")).toBe(false);
      expect(dmsetupHasWriteArg("dmsetup info vg-root")).toBe(false);
      expect(dmsetupHasWriteArg("dmsetup status")).toBe(false);
      expect(dmsetupHasWriteArg("dmsetup table")).toBe(false);
      expect(dmsetupHasWriteArg("dmsetup version")).toBe(false);
    });

    it("should allow ls with options", () => {
      expect(dmsetupHasWriteArg("dmsetup ls --tree")).toBe(false);
    });

    it("should allow subcommand regardless of case", () => {
      expect(dmsetupHasWriteArg("DMSETUP LS")).toBe(false);
    });

    it("should allow a leading short flag before a read-only subcommand", () => {
      expect(dmsetupHasWriteArg("dmsetup -v ls")).toBe(false);
    });

    it("should allow bare dmsetup", () => {
      expect(dmsetupHasWriteArg("dmsetup")).toBe(false);
    });

    it("should allow a short flag with no subcommand", () => {
      expect(dmsetupHasWriteArg("dmsetup -v")).toBe(false);
    });
  });

  describe("persistent write (blocked)", () => {
    it("should block remove", () => {
      expect(dmsetupHasWriteArg("dmsetup remove vg-old")).toBe(true);
    });

    it("should block create", () => {
      expect(dmsetupHasWriteArg("dmsetup create x --table '0 1 zero'")).toBe(true);
    });

    it("should block rename, suspend and wipe_table", () => {
      expect(dmsetupHasWriteArg("dmsetup rename a b")).toBe(true);
      expect(dmsetupHasWriteArg("dmsetup suspend x")).toBe(true);
      expect(dmsetupHasWriteArg("dmsetup wipe_table x")).toBe(true);
    });

    it("should block message and mknodes", () => {
      expect(dmsetupHasWriteArg("dmsetup message x 0 hi")).toBe(true);
      expect(dmsetupHasWriteArg("dmsetup mknodes")).toBe(true);
    });

    it("should block a write subcommand preceded by a short flag", () => {
      expect(dmsetupHasWriteArg("dmsetup -v remove x")).toBe(true);
    });

    it("should block a write subcommand after multiple short flags", () => {
      expect(dmsetupHasWriteArg("dmsetup -v -y remove x")).toBe(true);
    });

    it("should block a write subcommand behind a sudo prefix", () => {
      expect(dmsetupHasWriteArg("sudo dmsetup remove vg-old")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should return false for empty input", () => {
      expect(dmsetupHasWriteArg("")).toBe(false);
    });

    it("should ignore extra whitespace before the subcommand", () => {
      expect(dmsetupHasWriteArg("dmsetup    ls")).toBe(false);
      expect(dmsetupHasWriteArg("dmsetup    remove x")).toBe(true);
    });

    it("should treat unknown subcommands as write", () => {
      expect(dmsetupHasWriteArg("dmsetup foo")).toBe(true);
    });

    it("should treat a quoted write target as write", () => {
      expect(dmsetupHasWriteArg('dmsetup remove "vg old"')).toBe(true);
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

    it("classifies a remove without executing it", () => {
      expect(dmsetupHasWriteArg("dmsetup remove vg-old")).toBe(true);
    });
  });
});
