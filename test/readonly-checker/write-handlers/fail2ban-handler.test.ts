import { describe, it, expect } from "vitest";
import { fail2banHasWriteArg } from "../../../src/readonly-checker/write-handlers/fail2ban-handler.js";

describe("fail2banHasWriteArg", () => {
  describe("read-only commands", () => {
    it("should allow status without jail", () => {
      expect(fail2banHasWriteArg("fail2ban-client status")).toBe(false);
    });
    it("should allow status with jail name", () => {
      expect(fail2banHasWriteArg("fail2ban-client status sshd")).toBe(false);
      expect(fail2banHasWriteArg("fail2ban-client status apache2")).toBe(false);
    });
    it("should allow status with --full flag", () => {
      expect(fail2banHasWriteArg("fail2ban-client status --full")).toBe(false);
      expect(fail2banHasWriteArg("fail2ban-client status --full sshd")).toBe(false);
    });
    it("should allow gettag", () => {
      expect(fail2banHasWriteArg("fail2ban-client gettag <ip>")).toBe(false);
    });
  });

  describe("write commands", () => {
    it("should block set subcommand", () => {
      expect(fail2banHasWriteArg("fail2ban-client set sshd setban 192.168.1.1")).toBe(true);
      expect(fail2banHasWriteArg("fail2ban-client set sshd unsetban 192.168.1.1")).toBe(true);
    });
    it("should block reload", () => {
      expect(fail2banHasWriteArg("fail2ban-client reload")).toBe(true);
    });
    it("should block reconfigure", () => {
      expect(fail2banHasWriteArg("fail2ban-client reconfigure")).toBe(true);
    });
    it("should block start/stop/restart", () => {
      expect(fail2banHasWriteArg("fail2ban-client start")).toBe(true);
      expect(fail2banHasWriteArg("fail2ban-client stop")).toBe(true);
      expect(fail2banHasWriteArg("fail2ban-client restart")).toBe(true);
    });
    it("should allow ping (read-only)", () => {
      expect(fail2banHasWriteArg("fail2ban-client ping")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should return false when command does not contain fail2ban-client", () => {
      expect(fail2banHasWriteArg("ls -la")).toBe(false);
      expect(fail2banHasWriteArg("cat /etc/passwd")).toBe(false);
    });
    it("should handle flags before subcommand", () => {
      expect(fail2banHasWriteArg("fail2ban-client -v")).toBe(false);
      expect(fail2banHasWriteArg("fail2ban-client --version")).toBe(false);
    });
  });
});
