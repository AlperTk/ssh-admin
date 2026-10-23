import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { objcopyHasWriteArg } from "../../../src/readonly-checker/write-handlers/objcopy-handler.js";

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

// objcopy has no read-only allowance: the handler always reports a write.
describe("objcopyHasWriteArg", () => {
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

  describe("persistent writes (blocked)", () => {
    it("blocks a plain copy", () => {
      expect(objcopyHasWriteArg("objcopy in.o out.o")).toBe(true);
    });

    it("blocks symbol and section manipulation", () => {
      expect(objcopyHasWriteArg("objcopy --strip-all a.out")).toBe(true);
      expect(objcopyHasWriteArg("objcopy --remove-section .comment a.out")).toBe(true);
    });

    it("blocks informational invocations too (no read-only allowance)", () => {
      expect(objcopyHasWriteArg("objcopy --version")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("blocks bare command and empty input", () => {
      expect(objcopyHasWriteArg("objcopy")).toBe(true);
      expect(objcopyHasWriteArg("")).toBe(true);
    });

    it("blocks regardless of argument ordering or option form", () => {
      expect(objcopyHasWriteArg("objcopy a.out --strip-all")).toBe(true);
      expect(objcopyHasWriteArg("objcopy -- -weird")).toBe(true);
    });
  });

  describe("no execution", () => {
    it("classifies without spawning or writing anything", () => {
      expect(objcopyHasWriteArg("objcopy in.o out.o")).toBe(true);
    });
  });
});
