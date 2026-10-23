import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { ufwHasWriteArg } from "../../../src/readonly-checker/write-handlers/ufw-handler.js";

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

describe("ufwHasWriteArg", () => {
  describe("read-only (allowed)", () => {
    it("should allow status", () => {
      expect(ufwHasWriteArg("ufw status")).toBe(false);
    });

    it("should allow status with verbose argument", () => {
      expect(ufwHasWriteArg("ufw status verbose")).toBe(false);
    });

    it("should allow status numbered", () => {
      expect(ufwHasWriteArg("ufw status numbered")).toBe(false);
    });

    it("should allow show, list, help, version", () => {
      expect(ufwHasWriteArg("ufw show raw")).toBe(false);
      expect(ufwHasWriteArg("ufw list")).toBe(false);
      expect(ufwHasWriteArg("ufw help")).toBe(false);
      expect(ufwHasWriteArg("ufw version")).toBe(false);
    });

    it("should allow status after a short flag", () => {
      expect(ufwHasWriteArg("ufw -v status")).toBe(false);
    });

    it("should allow status with tab separator", () => {
      expect(ufwHasWriteArg("ufw\tstatus")).toBe(false);
    });

    it("should allow status with surrounding and extra whitespace", () => {
      expect(ufwHasWriteArg("  ufw   status  ")).toBe(false);
    });

    it("should match the command name and subcommand case-insensitively", () => {
      expect(ufwHasWriteArg("UFW STATUS")).toBe(false);
    });

    it("should allow a quoted read-only subcommand", () => {
      expect(ufwHasWriteArg("ufw 'status'")).toBe(false);
    });

    it("should allow status after multiple short flags", () => {
      expect(ufwHasWriteArg("ufw -v -q status")).toBe(false);
    });
  });

  describe("persistent write (blocked)", () => {
    it("should block enable", () => {
      expect(ufwHasWriteArg("ufw enable")).toBe(true);
    });

    it("should block disable", () => {
      expect(ufwHasWriteArg("ufw disable")).toBe(true);
    });

    it("should block allow rule", () => {
      expect(ufwHasWriteArg("ufw allow 22")).toBe(true);
    });

    it("should block deny rule", () => {
      expect(ufwHasWriteArg("ufw deny 22")).toBe(true);
    });

    it("should block reset", () => {
      expect(ufwHasWriteArg("ufw reset")).toBe(true);
    });

    it("should block delete", () => {
      expect(ufwHasWriteArg("ufw delete allow 22")).toBe(true);
    });

    it("should block reload", () => {
      expect(ufwHasWriteArg("ufw reload")).toBe(true);
    });

    it("should block default policy change", () => {
      expect(ufwHasWriteArg("ufw default deny incoming")).toBe(true);
    });

    it("should block --force before the subcommand", () => {
      expect(ufwHasWriteArg("ufw --force enable")).toBe(true);
    });

    it("should block a write after a short flag", () => {
      expect(ufwHasWriteArg("ufw -q allow 22")).toBe(true);
    });

    it("should block a write after multiple short flags", () => {
      expect(ufwHasWriteArg("ufw -v -q enable")).toBe(true);
    });

    it("should block a long option before the subcommand (not skipped as a short flag)", () => {
      expect(ufwHasWriteArg("ufw --dry-run allow 22")).toBe(true);
    });

    it("should block an uppercase write subcommand", () => {
      expect(ufwHasWriteArg("UFW ENABLE")).toBe(true);
    });

    it("should block a quoted write subcommand", () => {
      expect(ufwHasWriteArg("ufw 'enable'")).toBe(true);
    });

    it("should block an unknown subcommand (default-deny)", () => {
      expect(ufwHasWriteArg("ufw foobar")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should return false for empty input", () => {
      expect(ufwHasWriteArg("")).toBe(false);
    });

    it("should return false for whitespace-only input", () => {
      expect(ufwHasWriteArg("   ")).toBe(false);
    });

    it("should return false for a bare ufw", () => {
      expect(ufwHasWriteArg("ufw")).toBe(false);
      expect(ufwHasWriteArg("ufw   ")).toBe(false);
    });

    it("should return false when only short flags are present (no subcommand)", () => {
      expect(ufwHasWriteArg("ufw -q")).toBe(false);
    });

    it("should return false for a different command", () => {
      expect(ufwHasWriteArg("iptables -L")).toBe(false);
    });

    it("should treat '--' as a non-read-only subcommand", () => {
      expect(ufwHasWriteArg("ufw -- status")).toBe(true);
    });

    it("should treat a long flag placed before a read-only subcommand as write", () => {
      expect(ufwHasWriteArg("ufw --force status")).toBe(true);
    });

    it("should use only the first token as subcommand (status followed by write args is read-only)", () => {
      expect(ufwHasWriteArg("ufw status allow 22")).toBe(false);
    });

    it("SECURITY GAP: 'ufw logging on' changes logging config but is treated as read-only", () => {
      // Finding: 'logging' is in UFW_READ_ONLY regardless of arguments, so `logging on|off|low|...` passes.
      expect(ufwHasWriteArg("ufw logging on")).toBe(true);
    });

    it("'ufw app list' / 'ufw app info' are read-only; 'ufw app update' stays blocked", () => {
      expect(ufwHasWriteArg("ufw app list")).toBe(false);
      expect(ufwHasWriteArg("ufw app info")).toBe(false);
      expect(ufwHasWriteArg("ufw app update")).toBe(true);
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
      expect(ufwHasWriteArg("ufw status")).toBe(false);
      expect(ufwHasWriteArg("ufw enable")).toBe(true);
    });
  });
});
