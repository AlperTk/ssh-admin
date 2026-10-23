import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { trapHasWriteArg } from "../../../src/readonly-checker/write-handlers/trap-handler.js";

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

describe("trapHasWriteArg", () => {
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
    it("should allow bare trap (lists traps)", () => {
      expect(trapHasWriteArg("trap")).toBe(false);
    });

    it("should allow bare trap with surrounding whitespace", () => {
      expect(trapHasWriteArg("  trap  ")).toBe(false);
      expect(trapHasWriteArg("trap\t")).toBe(false);
    });
  });

  describe("persistent writes (blocked)", () => {
    it("should block trap with command and signal", () => {
      expect(trapHasWriteArg("trap 'rm -f /tmp/x' EXIT")).toBe(true);
    });

    it("should block trap reset with -", () => {
      expect(trapHasWriteArg("trap - INT")).toBe(true);
    });

    it("should block trap with a function name", () => {
      expect(trapHasWriteArg("trap cleanup EXIT")).toBe(true);
    });

    it("should block trap with an empty command string", () => {
      expect(trapHasWriteArg("trap ''")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should block empty input (non-bare form defaults to write)", () => {
      expect(trapHasWriteArg("")).toBe(true);
    });

    it("should block trap with extra spaces before arguments", () => {
      expect(trapHasWriteArg("trap    cleanup    EXIT")).toBe(true);
    });
  });
});
