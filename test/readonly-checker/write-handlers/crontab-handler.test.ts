import { describe, it, expect } from "vitest";
import { crontabHasWriteArg } from "../../../src/readonly-checker/write-handlers/crontab-handler.js";

describe("crontabHasWriteArg", () => {
  describe("read-only commands", () => {
    it("should allow crontab -l", () => {
      expect(crontabHasWriteArg("crontab -l")).toBe(false);
    });
    it("should block crontab -r (remove cron file)", () => {
      expect(crontabHasWriteArg("crontab -r")).toBe(true);
    });
    it("should block crontab -R (replace cron file)", () => {
      expect(crontabHasWriteArg("crontab -R")).toBe(true);
    });
    it("should allow crontab -i", () => {
      expect(crontabHasWriteArg("crontab -i")).toBe(false);
    });
    it("should allow crontab -v", () => {
      expect(crontabHasWriteArg("crontab -v")).toBe(false);
    });
    it("should allow crontab -l with user flag", () => {
      expect(crontabHasWriteArg("crontab -l -u www-data")).toBe(false);
      expect(crontabHasWriteArg("crontab -l -U root")).toBe(false);
    });
  });

  describe("write commands", () => {
    it("should block crontab -e", () => {
      expect(crontabHasWriteArg("crontab -e")).toBe(true);
    });
    it("should block crontab - (stdin write)", () => {
      expect(crontabHasWriteArg("crontab -")).toBe(true);
    });
    it("should block crontab -u root - (stdin with user flag)", () => {
      expect(crontabHasWriteArg("crontab -u root -")).toBe(true);
    });
  });
});
