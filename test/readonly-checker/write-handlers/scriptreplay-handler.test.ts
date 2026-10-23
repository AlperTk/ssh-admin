import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { scriptreplayHasWriteArg } from "../../../src/readonly-checker/write-handlers/scriptreplay-handler.js";

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

// scriptreplay only plays back recordings; the handler never reports a write.
describe("scriptreplayHasWriteArg", () => {
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
    it("allows bare scriptreplay", () => {
      expect(scriptreplayHasWriteArg("scriptreplay")).toBe(false);
    });

    it("allows replaying a timing and typescript pair", () => {
      expect(scriptreplayHasWriteArg("scriptreplay timing.log typescript")).toBe(false);
    });

    it("allows playback options such as --divisor", () => {
      expect(scriptreplayHasWriteArg("scriptreplay --divisor 2 timing.log typescript")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns false for empty and whitespace-only input", () => {
      expect(scriptreplayHasWriteArg("")).toBe(false);
      expect(scriptreplayHasWriteArg("   ")).toBe(false);
    });

    it("returns false regardless of argument ordering or quoting", () => {
      expect(scriptreplayHasWriteArg('scriptreplay "typescript" -t timing.log')).toBe(false);
      expect(scriptreplayHasWriteArg("SCRIPTREPLAY   --help")).toBe(false);
    });
  });

  describe("no execution", () => {
    it("classifies without spawning or writing anything", () => {
      expect(scriptreplayHasWriteArg("scriptreplay timing.log typescript")).toBe(false);
    });
  });
});
