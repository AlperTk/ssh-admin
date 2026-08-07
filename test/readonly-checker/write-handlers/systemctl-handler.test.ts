import { describe, it, expect } from "vitest";
import { systemctlHasWriteArg } from "../../../src/readonly-checker/write-handlers/systemctl-handler.js";

describe("systemctlHasWriteArg", () => {
  describe("read-only commands", () => {
    it("should allow systemctl status", () => {
      expect(systemctlHasWriteArg("systemctl status sshd")).toBe(false);
    });
    it("should allow systemctl is-active/is-enabled", () => {
      expect(systemctlHasWriteArg("systemctl is-active sshd")).toBe(false);
      expect(systemctlHasWriteArg("systemctl is-enabled nginx")).toBe(false);
    });
    it("should allow systemctl list-*", () => {
      expect(systemctlHasWriteArg("systemctl list-units")).toBe(false);
      expect(systemctlHasWriteArg("systemctl list-sockets")).toBe(false);
      expect(systemctlHasWriteArg("systemctl list-timers")).toBe(false);
    });
    it("should allow systemctl cat/show/get-default/help", () => {
      expect(systemctlHasWriteArg("systemctl cat sshd.service")).toBe(false);
      expect(systemctlHasWriteArg("systemctl show sshd")).toBe(false);
      expect(systemctlHasWriteArg("systemctl get-default")).toBe(false);
      expect(systemctlHasWriteArg("systemctl help")).toBe(false);
    });
  });

  describe("write commands", () => {
    it("should block systemctl edit/start/stop/restart", () => {
      expect(systemctlHasWriteArg("systemctl edit sshd")).toBe(true);
      expect(systemctlHasWriteArg("systemctl start nginx")).toBe(true);
      expect(systemctlHasWriteArg("systemctl stop apache2")).toBe(true);
      expect(systemctlHasWriteArg("systemctl restart mysql")).toBe(true);
    });
    it("should block systemctl enable/disable/mask/unmask", () => {
      expect(systemctlHasWriteArg("systemctl enable foo")).toBe(true);
      expect(systemctlHasWriteArg("systemctl disable bar")).toBe(true);
      expect(systemctlHasWriteArg("systemctl mask baz")).toBe(true);
      expect(systemctlHasWriteArg("systemctl unmask qux")).toBe(true);
    });
    it("should block systemctl daemon-reload", () => {
      expect(systemctlHasWriteArg("systemctl daemon-reload")).toBe(true);
    });
    it("should block systemctl kill", () => {
      expect(systemctlHasWriteArg("systemctl kill sshd")).toBe(true);
    });
    it("should block systemctl reboot/poweroff/halt/shutdown", () => {
      expect(systemctlHasWriteArg("systemctl reboot")).toBe(true);
      expect(systemctlHasWriteArg("systemctl poweroff")).toBe(true);
      expect(systemctlHasWriteArg("systemctl halt")).toBe(true);
      expect(systemctlHasWriteArg("systemctl shutdown")).toBe(true);
    });
    it("should block systemctl rescue/emergency", () => {
      expect(systemctlHasWriteArg("systemctl rescue")).toBe(true);
      expect(systemctlHasWriteArg("systemctl emergency")).toBe(true);
    });
  });
});
