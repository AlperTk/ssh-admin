import { describe, it, expect } from "vitest";
import { journalctlHasWriteArg } from "../../../src/readonly-checker/write-handlers/journalctl-handler.js";

describe("journalctlHasWriteArg", () => {
  describe("read-only commands", () => {
    it("should allow journalctl without flags", () => {
      expect(journalctlHasWriteArg("journalctl")).toBe(false);
    });
    it("should allow journalctl read flags", () => {
      expect(journalctlHasWriteArg("journalctl -f")).toBe(false);
      expect(journalctlHasWriteArg("journalctl -n 100")).toBe(false);
      expect(journalctlHasWriteArg("journalctl -o json")).toBe(false);
      expect(journalctlHasWriteArg("journalctl --no-pager")).toBe(false);
      expect(journalctlHasWriteArg("journalctl --list-boots")).toBe(false);
      expect(journalctlHasWriteArg("journalctl --disk")).toBe(false);
      expect(journalctlHasWriteArg("journalctl --verify")).toBe(false);
    });
    it("should allow journalctl unit/service filtering", () => {
      expect(journalctlHasWriteArg("journalctl -u sshd")).toBe(false);
      expect(journalctlHasWriteArg("journalctl --unit nginx")).toBe(false);
      expect(journalctlHasWriteArg("journalctl _SYSTEMD_UNIT=apache2.service")).toBe(false);
    });
    it("should allow journalctl time/priority filtering", () => {
      expect(journalctlHasWriteArg("journalctl --since today")).toBe(false);
      expect(journalctlHasWriteArg("journalctl --until yesterday")).toBe(false);
      expect(journalctlHasWriteArg("journalctl -p info")).toBe(false);
      expect(journalctlHasWriteArg("journalctl --priority info")).toBe(false);
    });
  });

  describe("write commands", () => {
    it("should block journalctl --vacuum-size", () => {
      expect(journalctlHasWriteArg("journalctl --vacuum-size=1G")).toBe(true);
      expect(journalctlHasWriteArg("journalctl --vacuum-size 1G")).toBe(true);
    });
    it("should block journalctl --vacuum-time", () => {
      expect(journalctlHasWriteArg("journalctl --vacuum-time=2days")).toBe(true);
      expect(journalctlHasWriteArg("journalctl --vacuum-time 2days")).toBe(true);
    });
    it("should block journalctl --vacuum-files", () => {
      expect(journalctlHasWriteArg("journalctl --vacuum-files=10")).toBe(true);
      expect(journalctlHasWriteArg("journalctl --vacuum-files 10")).toBe(true);
    });
    it("should block journalctl --rotate", () => {
      expect(journalctlHasWriteArg("journalctl --rotate")).toBe(true);
    });
    it("should block journalctl --flush", () => {
      expect(journalctlHasWriteArg("journalctl --flush")).toBe(true);
    });
    it("should block journalctl --sync", () => {
      expect(journalctlHasWriteArg("journalctl --sync")).toBe(true);
    });
    it("should block journalctl --relinquish-mount", () => {
      expect(journalctlHasWriteArg("journalctl --relinquish-mount")).toBe(true);
    });
    it("should block journalctl --disk-size", () => {
      expect(journalctlHasWriteArg("journalctl --disk-size=4G")).toBe(true);
    });
    it("should block journalctl --max-file-size", () => {
      expect(journalctlHasWriteArg("journalctl --max-file-size=512M")).toBe(true);
    });
    it("should block journalctl --compress", () => {
      expect(journalctlHasWriteArg("journalctl --compress")).toBe(true);
    });
    it("should block journalctl --move-catalog", () => {
      expect(journalctlHasWriteArg("journalctl --move-catalog /tmp")).toBe(true);
    });
    it("should block journalctl --compress-catalog", () => {
      expect(journalctlHasWriteArg("journalctl --compress-catalog")).toBe(true);
    });
  });
});
