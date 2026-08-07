import { describe, it, expect } from "vitest";
import { aptHasWriteArg } from "../../../src/readonly-checker/write-handlers/apt-handler.js";

describe("aptHasWriteArg", () => {
  describe("read-only commands", () => {
    it("should allow apt list/show/search/policy/info", () => {
      expect(aptHasWriteArg("apt list --upgradable")).toBe(false);
      expect(aptHasWriteArg("apt show vim")).toBe(false);
      expect(aptHasWriteArg("apt search nginx")).toBe(false);
      expect(aptHasWriteArg("apt policy sshd")).toBe(false);
      expect(aptHasWriteArg("apt info curl")).toBe(false);
    });
    it("should allow apt cache/show/depends/rdepends/madison", () => {
      expect(aptHasWriteArg("apt cache show bash")).toBe(false);
      expect(aptHasWriteArg("apt depends git")).toBe(false);
      expect(aptHasWriteArg("apt rdepends git")).toBe(false);
      expect(aptHasWriteArg("apt madison vim")).toBe(false);
    });
    it("should block apt update (writes package cache)", () => {
      expect(aptHasWriteArg("apt update")).toBe(true);
    });
    it("should block apt upgrade/full-upgrade/dist-upgrade (write operations)", () => {
      expect(aptHasWriteArg("apt upgrade")).toBe(true);
      expect(aptHasWriteArg("apt full-upgrade")).toBe(true);
      expect(aptHasWriteArg("apt dist-upgrade")).toBe(true);
      expect(aptHasWriteArg("apt check")).toBe(false);
      expect(aptHasWriteArg("apt autoremove")).toBe(false);
    });
  });

  describe("write commands", () => {
    it("should block apt install/remove/purge/reinstall", () => {
      expect(aptHasWriteArg("apt install vim")).toBe(true);
      expect(aptHasWriteArg("apt remove vim")).toBe(true);
      expect(aptHasWriteArg("apt purge vim")).toBe(true);
      expect(aptHasWriteArg("apt reinstall vim")).toBe(true);
    });
    it("should block apt hold/unhold/clean/autoclean/fix-broken", () => {
      expect(aptHasWriteArg("apt hold vim")).toBe(true);
      expect(aptHasWriteArg("apt unhold vim")).toBe(true);
      expect(aptHasWriteArg("apt clean")).toBe(true);
      expect(aptHasWriteArg("apt autoclean")).toBe(true);
      expect(aptHasWriteArg("apt fix-broken")).toBe(true);
    });
  });
});
