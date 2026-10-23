import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { hostnameHasWriteArg } from "../../../src/readonly-checker/write-handlers/hostname-handler.js";

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

describe("hostnameHasWriteArg", () => {
  describe("read-only (allowed)", () => {
    it("should allow bare hostname (shows name)", () => {
      expect(hostnameHasWriteArg("hostname")).toBe(false);
    });

    it("should allow read flags without an argument", () => {
      expect(hostnameHasWriteArg("hostname -f")).toBe(false);
      expect(hostnameHasWriteArg("hostname -i")).toBe(false);
      expect(hostnameHasWriteArg("hostname -I")).toBe(false);
      expect(hostnameHasWriteArg("hostname -s")).toBe(false);
      expect(hostnameHasWriteArg("hostname -d")).toBe(false);
    });

    it("should allow multiple read flags without an argument", () => {
      expect(hostnameHasWriteArg("hostname -f -d")).toBe(false);
    });

    it("should allow combined short read flags", () => {
      expect(hostnameHasWriteArg("hostname -fs")).toBe(false);
    });

    it("should allow bare hostname with surrounding whitespace", () => {
      expect(hostnameHasWriteArg("hostname   ")).toBe(false);
    });
  });

  describe("persistent write (blocked)", () => {
    it("should block setting a new hostname", () => {
      expect(hostnameHasWriteArg("hostname myhost")).toBe(true);
    });

    it("should block setting a hostname after a read flag", () => {
      expect(hostnameHasWriteArg("hostname -f newhost")).toBe(true);
    });

    it("should block setting a hostname with -b (boot-time) flag", () => {
      expect(hostnameHasWriteArg("hostname -b newhost")).toBe(true);
    });

    it("should block setting a hostname from a file (-F)", () => {
      expect(hostnameHasWriteArg("hostname -F /etc/hostname")).toBe(true);
    });

    it("should block a set-hostname invoked via sudo", () => {
      expect(hostnameHasWriteArg("sudo hostname newhost")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should return false for empty input", () => {
      expect(hostnameHasWriteArg("")).toBe(false);
    });

    it("should return false when hostname is not present", () => {
      expect(hostnameHasWriteArg("uname -a")).toBe(false);
    });

    it("should match the command name case-insensitively", () => {
      expect(hostnameHasWriteArg("HOSTNAME newhost")).toBe(true);
      expect(hostnameHasWriteArg("HOSTNAME -f")).toBe(false);
    });

    it("should ignore extra whitespace before the argument", () => {
      expect(hostnameHasWriteArg("hostname    myhost")).toBe(true);
    });

    it("should block a set when the only read flag is followed by a quoted name", () => {
      expect(hostnameHasWriteArg("hostname -s 'my host'")).toBe(true);
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

    it("classifies a hostname set without executing it", () => {
      expect(hostnameHasWriteArg("hostname myhost")).toBe(true);
    });
  });
});
