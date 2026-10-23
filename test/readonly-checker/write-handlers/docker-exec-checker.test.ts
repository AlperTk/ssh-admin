// NOTE: dockerExecHasWriteArg is NOT registered in CommandChecker.buildHandlers.
// It is tested here only as a direct function call; it is not part of the registered handler chain.
import { describe, it, expect, vi, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { dockerExecHasWriteArg } from "../../../src/readonly-checker/write-handlers/docker-exec-checker.js";

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

describe("dockerExecHasWriteArg (direct function; not registered in CommandChecker)", () => {
  describe("read-only (allowed)", () => {
    it("should allow cat of a file inside the container", () => {
      expect(dockerExecHasWriteArg("docker exec web cat /etc/hosts")).toBe(false);
    });

    it("should allow ls with flags", () => {
      expect(dockerExecHasWriteArg("docker exec web ls -la /var/log")).toBe(false);
    });

    it("should allow interactive flag with a read-only command", () => {
      expect(dockerExecHasWriteArg("docker exec -it web ls")).toBe(false);
    });

    it("should allow a command whose name only contains a shell name as a substring", () => {
      expect(dockerExecHasWriteArg("docker exec web cat /etc/bashrc")).toBe(false);
    });

    it("should allow a simple read-only command", () => {
      expect(dockerExecHasWriteArg("docker exec web uptime")).toBe(false);
    });
  });

  describe("persistent write (blocked)", () => {
    it("should block rm", () => {
      expect(dockerExecHasWriteArg("docker exec web rm -rf /tmp/x")).toBe(true);
    });

    it("should block touch", () => {
      expect(dockerExecHasWriteArg("docker exec web touch /tmp/x")).toBe(true);
    });

    it("should block mkdir", () => {
      expect(dockerExecHasWriteArg("docker exec web mkdir /data")).toBe(true);
    });

    it("should block cp", () => {
      expect(dockerExecHasWriteArg("docker exec web cp a /etc/a")).toBe(true);
    });

    it("should block mv", () => {
      expect(dockerExecHasWriteArg("docker exec web mv a b")).toBe(true);
    });

    it("should block dd", () => {
      expect(dockerExecHasWriteArg("docker exec web dd if=/dev/zero of=/x")).toBe(true);
    });

    it("should block truncate", () => {
      expect(dockerExecHasWriteArg("docker exec web truncate -s 0 /var/log/x")).toBe(true);
    });

    it("should block append redirect to an absolute path", () => {
      expect(dockerExecHasWriteArg("docker exec web echo hi >> /etc/motd")).toBe(true);
    });

    it("should block overwrite redirect to an absolute path", () => {
      expect(dockerExecHasWriteArg("docker exec web echo hi > /etc/motd")).toBe(true);
    });

    it("should block redirect to a parent-relative path", () => {
      expect(dockerExecHasWriteArg("docker exec web echo hi > ../x")).toBe(true);
      expect(dockerExecHasWriteArg("docker exec web echo hi >../x")).toBe(true);
    });

    it("should block an interactive bash", () => {
      expect(dockerExecHasWriteArg("docker exec -it web bash")).toBe(true);
    });

    it("should block sh -c", () => {
      expect(dockerExecHasWriteArg("docker exec web sh -c 'ls'")).toBe(true);
    });

    it("should block an absolute shell path", () => {
      expect(dockerExecHasWriteArg("docker exec web /bin/sh")).toBe(true);
      expect(dockerExecHasWriteArg("docker exec web /usr/bin/bash -c id")).toBe(true);
    });

    it("should block zsh", () => {
      expect(dockerExecHasWriteArg("docker exec web zsh")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should return false for empty input", () => {
      expect(dockerExecHasWriteArg("")).toBe(false);
    });

    it("should return false for whitespace-only input", () => {
      expect(dockerExecHasWriteArg("   ")).toBe(false);
    });

    it("should treat a write-pattern word inside another token as write (word-boundary match)", () => {
      // Conservative: 'rm' followed by '.' still matches \brm\b.
      expect(dockerExecHasWriteArg("docker exec web cat rm.log")).toBe(true);
    });

    it("SECURITY GAP: redirect to a relative file is not detected (returns false)", () => {
      // Finding: WRITE_PATTERNS only match '>' followed by '/' or '..'; `> out.txt` passes.
      expect(dockerExecHasWriteArg("docker exec web echo hi > out.txt")).toBe(true);
    });

    it("SECURITY GAP: tee is not detected (returns false)", () => {
      // Finding: no WRITE_PATTERNS entry for tee.
      expect(dockerExecHasWriteArg("docker exec web tee /etc/motd")).toBe(true);
    });

    it("SECURITY GAP: sed -i in-place edit is not detected (returns false)", () => {
      // Finding: no WRITE_PATTERNS entry for sed -i.
      expect(dockerExecHasWriteArg("docker exec web sed -i s/a/b/ /etc/x")).toBe(true);
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
      expect(dockerExecHasWriteArg("docker exec web cat /etc/hosts")).toBe(false);
      expect(dockerExecHasWriteArg("docker exec web rm -rf /tmp/x")).toBe(true);
    });
  });
});
