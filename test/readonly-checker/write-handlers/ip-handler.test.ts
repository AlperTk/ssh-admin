import { describe, it, expect } from "vitest";
import { ipHasWriteArg } from "../../../src/readonly-checker/write-handlers/ip-handler.js";

describe("ipHasWriteArg", () => {
  describe("read-only commands", () => {
    it("should allow ip addr show/list", () => {
      expect(ipHasWriteArg("ip addr show")).toBe(false);
      expect(ipHasWriteArg("ip addr list")).toBe(false);
    });
    it("should allow ip link show", () => {
      expect(ipHasWriteArg("ip link show")).toBe(false);
    });
    it("should allow ip route show/list", () => {
      expect(ipHasWriteArg("ip route show")).toBe(false);
      expect(ipHasWriteArg("ip route list")).toBe(false);
    });
    it("should allow ip neigh/rule/tunnel/xfrm/maddr show", () => {
      expect(ipHasWriteArg("ip neigh show")).toBe(false);
      expect(ipHasWriteArg("ip rule show")).toBe(false);
      expect(ipHasWriteArg("ip tunnel show")).toBe(false);
      expect(ipHasWriteArg("ip xfrm state show")).toBe(false);
      expect(ipHasWriteArg("ip maddr show")).toBe(false);
    });
    it("should allow ip monitor/check/session", () => {
      expect(ipHasWriteArg("ip monitor link")).toBe(false);
      expect(ipHasWriteArg("ip check")).toBe(false);
      expect(ipHasWriteArg("ip session show")).toBe(false);
    });
  });

  describe("write commands", () => {
    it("should block ip addr add/del/flush", () => {
      expect(ipHasWriteArg("ip addr add 10.0.0.1/24 dev eth0")).toBe(true);
      expect(ipHasWriteArg("ip addr del 10.0.0.1/24 dev eth0")).toBe(true);
      expect(ipHasWriteArg("ip addr flush eth0")).toBe(true);
    });
    it("should block ip link set/add/delete", () => {
      expect(ipHasWriteArg("ip link set eth0 up")).toBe(true);
      expect(ipHasWriteArg("ip link add eth1 type vlan")).toBe(true);
      expect(ipHasWriteArg("ip link delete eth1")).toBe(true);
    });
    it("should block ip route add/del/replace", () => {
      expect(ipHasWriteArg("ip route add 10.0.0.0/8 via 192.168.1.1")).toBe(true);
      expect(ipHasWriteArg("ip route del 10.0.0.0/8")).toBe(true);
      expect(ipHasWriteArg("ip route replace 10.0.0.0/8 via 192.168.1.1")).toBe(true);
    });
    it("should block ip neigh add/del", () => {
      expect(ipHasWriteArg("ip neigh add 10.0.0.1 lladdr aa:bb:cc:dd:ee:ff dev eth0")).toBe(true);
      expect(ipHasWriteArg("ip neigh del 10.0.0.1 dev eth0")).toBe(true);
    });
    it("should block ip rule add/del", () => {
      expect(ipHasWriteArg("ip rule add from 10.0.0.0/8 table 100")).toBe(true);
      expect(ipHasWriteArg("ip rule del 100")).toBe(true);
    });
  });
});
