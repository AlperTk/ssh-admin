import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { snapHasWriteArg } from "../../../src/readonly-checker/write-handlers/snap-handler.js";

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

describe("snapHasWriteArg", () => {
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

  describe("read-only (allowed)", () => {
    it("should allow snap list", () => {
      expect(snapHasWriteArg("snap list")).toBe(false);
    });

    it("should allow other read-only subcommands", () => {
      expect(snapHasWriteArg("snap info core")).toBe(false);
      expect(snapHasWriteArg("snap find vlc")).toBe(false);
      expect(snapHasWriteArg("snap changes")).toBe(false);
      expect(snapHasWriteArg("snap services")).toBe(false);
      expect(snapHasWriteArg("snap get core")).toBe(false);
      expect(snapHasWriteArg("snap version")).toBe(false);
      expect(snapHasWriteArg("snap whoami")).toBe(false);
      expect(snapHasWriteArg("snap connections")).toBe(false);
      expect(snapHasWriteArg("snap interfaces")).toBe(false);
      expect(snapHasWriteArg("snap available")).toBe(false);
      expect(snapHasWriteArg("snap saved")).toBe(false);
      expect(snapHasWriteArg("snap check-snapshot 1")).toBe(false);
    });

    it("should allow read-only subcommand with trailing arguments", () => {
      expect(snapHasWriteArg("snap list --all")).toBe(false);
    });

    it("should match subcommand case-insensitively", () => {
      expect(snapHasWriteArg("SNAP LIST")).toBe(false);
    });

    it("should allow read-only subcommand after a short flag", () => {
      expect(snapHasWriteArg("snap -q list")).toBe(false);
    });

    it("should allow quoted read-only subcommand", () => {
      expect(snapHasWriteArg("snap 'list'")).toBe(false);
    });
  });

  describe("persistent writes (blocked)", () => {
    it("should block snap install", () => {
      expect(snapHasWriteArg("snap install vlc")).toBe(true);
    });

    it("should block snap remove", () => {
      expect(snapHasWriteArg("snap remove vlc")).toBe(true);
    });

    it("should block snap refresh, enable, disable, revert, start, stop, restart", () => {
      expect(snapHasWriteArg("snap refresh")).toBe(true);
      expect(snapHasWriteArg("snap enable core")).toBe(true);
      expect(snapHasWriteArg("snap disable core")).toBe(true);
      expect(snapHasWriteArg("snap revert core")).toBe(true);
      expect(snapHasWriteArg("snap start nginx")).toBe(true);
      expect(snapHasWriteArg("snap stop nginx")).toBe(true);
      expect(snapHasWriteArg("snap restart nginx")).toBe(true);
    });

    it("should block snap set and connect", () => {
      expect(snapHasWriteArg("snap set core proxy.http=x")).toBe(true);
      expect(snapHasWriteArg("snap connect vlc:x core:y")).toBe(true);
    });

    it("should block mixed-case write subcommand", () => {
      expect(snapHasWriteArg("Snap Install vlc")).toBe(true);
    });

    it("should block write subcommand after a short flag", () => {
      expect(snapHasWriteArg("snap -q install vlc")).toBe(true);
    });

    it("should block quoted write subcommand", () => {
      expect(snapHasWriteArg('snap "install" vlc')).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should return false for bare snap", () => {
      expect(snapHasWriteArg("snap")).toBe(false);
    });

    it("should return false for snap with only whitespace after it", () => {
      expect(snapHasWriteArg("snap   ")).toBe(false);
      expect(snapHasWriteArg("snap\t")).toBe(false);
    });

    it("should return false for input without snap", () => {
      expect(snapHasWriteArg("")).toBe(false);
      expect(snapHasWriteArg("apt install vlc")).toBe(false);
    });

    it("should ignore extra spaces between subcommand and arguments", () => {
      expect(snapHasWriteArg("snap    install    vlc")).toBe(true);
      expect(snapHasWriteArg("snap    info    core")).toBe(false);
    });

    it("should return false for a short flag with no subcommand", () => {
      expect(snapHasWriteArg("snap -h")).toBe(false);
    });
  });
});
