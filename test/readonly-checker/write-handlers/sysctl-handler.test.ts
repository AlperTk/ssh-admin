import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { sysctlHasWriteArg } from "../../../src/readonly-checker/write-handlers/sysctl-handler.js";

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

describe("sysctlHasWriteArg", () => {
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
    it("should allow listing all keys", () => {
      expect(sysctlHasWriteArg("sysctl -a")).toBe(false);
      expect(sysctlHasWriteArg("sysctl --all")).toBe(false);
    });

    it("should allow reading a single key", () => {
      expect(sysctlHasWriteArg("sysctl kernel.hostname")).toBe(false);
      expect(sysctlHasWriteArg("sysctl -n kernel.hostname")).toBe(false);
    });

    it("should allow read-only flags combined with a key", () => {
      expect(sysctlHasWriteArg("sysctl -n -e kernel.hostname")).toBe(false);
    });

    it("should allow pattern and tree listing", () => {
      expect(sysctlHasWriteArg("sysctl -a --pattern net")).toBe(false);
      expect(sysctlHasWriteArg("sysctl --tree kernel")).toBe(false);
    });
  });

  describe("persistent writes (blocked)", () => {
    it("should block -w with key=value", () => {
      expect(sysctlHasWriteArg("sysctl -w net.ipv4.ip_forward=1")).toBe(true);
      expect(sysctlHasWriteArg("sysctl -w vm.swappiness=10")).toBe(true);
    });

    it("should block key=value without -w", () => {
      expect(sysctlHasWriteArg("sysctl net.ipv4.ip_forward=1")).toBe(true);
    });

    it("should block key=value after an ignore-errors flag", () => {
      expect(sysctlHasWriteArg("sysctl -e -w net.ipv4.ip_forward=1")).toBe(true);
    });

    it("should block combined short flags containing -w", () => {
      expect(sysctlHasWriteArg("sysctl -nw net.ipv4.ip_forward=1")).toBe(true);
    });

    // Known gap: skipFlags cuts a long option at the first '=' (of the key), leaving "=1" as the
    // token, so --write with key=value is treated as read-only.
    it("SECURITY GAP: should block --write with key=value", () => {
      expect(sysctlHasWriteArg("sysctl --write net.ipv4.ip_forward=1")).toBe(true);
    });

    // Known gap: -w / --write detection uses \b-w\b / \b--write\b, which cannot match at the
    // start of the argument string, so a dot-less key=value after -w is treated as read-only.
    it("SECURITY GAP: should block -w with dot-less key=value", () => {
      expect(sysctlHasWriteArg("sysctl -w kernel=1")).toBe(true);
    });

    it("SECURITY GAP: should block --write with dot-less key=value", () => {
      expect(sysctlHasWriteArg("sysctl --write kernel=1")).toBe(true);
    });

    // Known gap: loading settings from a file (-p) or all config files (--system) applies writes
    // but the handler has no detection path for them and returns false.
    it("SECURITY GAP: should block -p <file> (loads and applies settings)", () => {
      expect(sysctlHasWriteArg("sysctl -p /etc/sysctl.conf")).toBe(true);
    });

    it("SECURITY GAP: should block --system (reloads and applies all config files)", () => {
      expect(sysctlHasWriteArg("sysctl --system")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should return false for bare sysctl", () => {
      expect(sysctlHasWriteArg("sysctl")).toBe(false);
      expect(sysctlHasWriteArg("sysctl   ")).toBe(false);
    });

    it("should return false for flags only", () => {
      expect(sysctlHasWriteArg("sysctl -e")).toBe(false);
    });

    it("should treat a dotted token without '=' as read-only", () => {
      expect(sysctlHasWriteArg("sysctl kernel.hostname=")).toBe(true);
      expect(sysctlHasWriteArg("sysctl /etc/sysctl.conf")).toBe(false);
    });

    it("should handle extra spaces between flags and key", () => {
      expect(sysctlHasWriteArg("sysctl   -n   kernel.hostname")).toBe(false);
      expect(sysctlHasWriteArg("sysctl   -e   net.ipv4.ip_forward=1")).toBe(true);
    });
  });
});
