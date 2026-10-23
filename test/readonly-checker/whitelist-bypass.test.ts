import { describe, it, expect } from "vitest";
import { CommandChecker } from "../../src/readonly-checker.js";

// Regression tests reproducing known whitelist bypasses.
// Each bypass test asserts the SAFE behavior (command denied). They are expected to FAIL on current code.
describe("whitelist bypass", () => {
  const checker = new CommandChecker();

  describe("positive control", () => {
    it("ls -la is allowed (guards against over-blocking)", () => {
      expect(checker.check("ls -la")).toEqual({ allowed: true });
    });

    it("git status is allowed (guards against over-blocking)", () => {
      expect(checker.check("git status")).toEqual({ allowed: true });
    });
  });

  describe("bypass cases", () => {
    it("B1: single & is not a command separator (ls & rm -f /tmp/probe)", () => {
      expect(checker.check("ls & rm -f /tmp/probe")).toMatchObject({ allowed: false });
    });

    it("B2: single & is not a command separator (ls & git push origin)", () => {
      expect(checker.check("ls & git push origin")).toMatchObject({ allowed: false });
    });

    it("B3: single & is not a command separator (ls & docker rm -f c)", () => {
      expect(checker.check("ls & docker rm -f c")).toMatchObject({ allowed: false });
    });

    it("B4: literal newline is a command separator (echo ok\\nrm -f /tmp/probe)", () => {
      expect(checker.check("echo ok\nrm -f /tmp/probe")).toMatchObject({ allowed: false });
    });

    it('B5: escaped double quote must not hide a separator (echo \\"; rm -f /tmp/probe)', () => {
      expect(checker.check('echo \\"; rm -f /tmp/probe')).toMatchObject({ allowed: false });
    });

    it('B6: escaped double quote must not hide a redirect (echo \\" > /tmp/probe)', () => {
      expect(checker.check('echo \\" > /tmp/probe')).toMatchObject({ allowed: false });
    });

    it("B7: timeout wrapper must be peeled to reveal rm (timeout --kill-after=1 5 rm -- ls)", () => {
      expect(checker.check("timeout --kill-after=1 5 rm -- ls")).toMatchObject({ allowed: false });
    });

    it("B8: ionice wrapper must be peeled to reveal rm (ionice --class=3 rm ls)", () => {
      expect(checker.check("ionice --class=3 rm ls")).toMatchObject({ allowed: false });
    });

    it("B9: stdbuf wrapper must be peeled to reveal rm (stdbuf --output=L rm ls)", () => {
      expect(checker.check("stdbuf --output=L rm ls")).toMatchObject({ allowed: false });
    });

    it("B10: git config write via key/value form (git config core.fsmonitor 'touch /tmp/probe')", () => {
      expect(checker.check("git config core.fsmonitor 'touch /tmp/probe'")).toMatchObject({ allowed: false });
    });

    it("B11: git config --file= write form (git config --file=/tmp/x a.b c)", () => {
      expect(checker.check("git config --file=/tmp/x a.b c")).toMatchObject({ allowed: false });
    });

    it("B12: git config --file <path> write form (git config --file /tmp/x a b)", () => {
      expect(checker.check("git config --file /tmp/x a b")).toMatchObject({ allowed: false });
    });

    it("B13: git config --add --global write (git config --add --global alias.x '!id')", () => {
      expect(checker.check("git config --add --global alias.x '!id'")).toMatchObject({ allowed: false });
    });

    it("B14: git diff --output writes a file (git diff --output=/tmp/probe)", () => {
      // Precondition met: existing tests treat `git diff` as allowed read-only.
      expect(checker.check("git diff --output=/tmp/probe")).toMatchObject({ allowed: false });
    });

    it("B15: find -delete removes files (find /tmp/d -delete)", () => {
      expect(checker.check("find /tmp/d -delete")).toMatchObject({ allowed: false });
    });

    it("B16: sed e-flag executes shell (sed '1e rm -f /tmp/probe' file)", () => {
      expect(checker.check("sed '1e rm -f /tmp/probe' file")).toMatchObject({ allowed: false });
    });
  });
});
