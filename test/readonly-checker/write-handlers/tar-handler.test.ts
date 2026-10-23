import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { tarHasWriteArg } from "../../../src/readonly-checker/write-handlers/tar-handler.js";

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

describe("tarHasWriteArg", () => {
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
    it("should allow listing with -tf", () => {
      expect(tarHasWriteArg("tar -tf archive.tar")).toBe(false);
    });

    it("should allow bare -t", () => {
      expect(tarHasWriteArg("tar -t")).toBe(false);
    });

    it("should allow listing with old-style safe flags", () => {
      expect(tarHasWriteArg("tar tf archive.tar")).toBe(false);
      expect(tarHasWriteArg("tar tvf archive.tar")).toBe(false);
      expect(tarHasWriteArg("tar tzf archive.tar.gz")).toBe(false);
    });

    it("should allow --list", () => {
      expect(tarHasWriteArg("tar --list -f archive.tar")).toBe(false);
    });

    it("should allow listing with compression flag", () => {
      expect(tarHasWriteArg("tar -tzf archive.tgz")).toBe(false);
    });
  });

  describe("persistent writes (blocked)", () => {
    it("should block -c (create)", () => {
      expect(tarHasWriteArg("tar -cf a.tar dir")).toBe(true);
      expect(tarHasWriteArg("tar -czf a.tgz dir")).toBe(true);
    });

    it("should block -x (extract)", () => {
      expect(tarHasWriteArg("tar -xf a.tar")).toBe(true);
      expect(tarHasWriteArg("tar -xzf a.tgz")).toBe(true);
    });

    it("should block -r (append) and -u (update)", () => {
      expect(tarHasWriteArg("tar -rf a.tar file")).toBe(true);
      expect(tarHasWriteArg("tar -uf a.tar file")).toBe(true);
    });

    it("should block long create and extract options", () => {
      expect(tarHasWriteArg("tar --create --file=a.tar dir")).toBe(true);
      expect(tarHasWriteArg("tar --extract --file=a.tar")).toBe(true);
    });

    it("should block old-style write flags without dash", () => {
      expect(tarHasWriteArg("tar cf a.tar dir")).toBe(true);
      expect(tarHasWriteArg("tar xf a.tar")).toBe(true);
      expect(tarHasWriteArg("tar rf a.tar file")).toBe(true);
    });

    it("should block --warning= option even with safe flags", () => {
      expect(tarHasWriteArg("tar tf a.tar --warning=no-file-changed")).toBe(true);
    });

    it("should block unrecognised dash flags by default", () => {
      expect(tarHasWriteArg("tar -v")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should return false for bare tar", () => {
      expect(tarHasWriteArg("tar")).toBe(false);
      expect(tarHasWriteArg("   ")).toBe(false);
    });

    it("should return false for empty input", () => {
      expect(tarHasWriteArg("")).toBe(false);
    });

    it("should not match tar as part of a larger word", () => {
      expect(tarHasWriteArg("tarball -cf x")).toBe(false);
    });

    it("should handle extra spaces and leading whitespace", () => {
      expect(tarHasWriteArg("   tar    -tf   a.tar")).toBe(false);
      expect(tarHasWriteArg("   tar    -cf   a.tar dir")).toBe(true);
    });

    it("should match tar case-insensitively", () => {
      expect(tarHasWriteArg("TAR -tf a.tar")).toBe(false);
      expect(tarHasWriteArg("TAR -cf a.tar dir")).toBe(true);
    });
  });
});
