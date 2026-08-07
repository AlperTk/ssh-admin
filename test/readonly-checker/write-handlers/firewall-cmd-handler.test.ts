import { describe, it, expect } from "vitest";
import { firewallCmdHasWriteArg } from "../../../src/readonly-checker/write-handlers/firewall-cmd-handler.js";

describe("firewallCmdHasWriteArg", () => {
  describe("read-only commands", () => {
    it("should allow --list-* commands", () => {
      expect(firewallCmdHasWriteArg("firewall-cmd --list-all")).toBe(false);
      expect(firewallCmdHasWriteArg("firewall-cmd --list-ports")).toBe(false);
      expect(firewallCmdHasWriteArg("firewall-cmd --list-services")).toBe(false);
      expect(firewallCmdHasWriteArg("firewall-cmd --list-protocols")).toBe(false);
      expect(firewallCmdHasWriteArg("firewall-cmd --list-rich-rules")).toBe(false);
      expect(firewallCmdHasWriteArg("firewall-cmd --list-all-zones")).toBe(false);
    });
    it("should allow --get-* commands", () => {
      expect(firewallCmdHasWriteArg("firewall-cmd --get-active-zones")).toBe(false);
      expect(firewallCmdHasWriteArg("firewall-cmd --get-default-zone")).toBe(false);
      expect(firewallCmdHasWriteArg("firewall-cmd --get-zones")).toBe(false);
    });
  });

  describe("write commands", () => {
    it("should block --add-port/--remove-port", () => {
      expect(firewallCmdHasWriteArg("firewall-cmd --add-port=80/tcp")).toBe(true);
      expect(firewallCmdHasWriteArg("firewall-cmd --remove-port=80/tcp")).toBe(true);
    });
    it("should block --enable/--disable", () => {
      expect(firewallCmdHasWriteArg("firewall-cmd --enable")).toBe(true);
      expect(firewallCmdHasWriteArg("firewall-cmd --disable")).toBe(true);
    });
    it("should block --reload", () => {
      expect(firewallCmdHasWriteArg("firewall-cmd --reload")).toBe(true);
    });
    it("should block --runtime-to-conf", () => {
      expect(firewallCmdHasWriteArg("firewall-cmd --runtime-to-conf")).toBe(true);
    });
  });
});
