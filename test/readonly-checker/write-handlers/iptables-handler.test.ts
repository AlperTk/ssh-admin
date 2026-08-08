import { describe, it, expect } from "vitest";
import { iptablesHasWriteArg } from "../../../src/readonly-checker/write-handlers/iptables-handler.js";

describe("iptablesHasWriteArg", () => {
  describe("read-only commands", () => {
    it("should allow iptables -L", () => {
      expect(iptablesHasWriteArg("iptables -L")).toBe(false);
    });

    it("should allow iptables -S", () => {
      expect(iptablesHasWriteArg("iptables -S")).toBe(false);
    });

    it("should allow iptables -C", () => {
      expect(iptablesHasWriteArg("iptables -C INPUT -p tcp --dport 22 -j ACCEPT")).toBe(false);
    });

    it("should allow iptables -L -n", () => {
      expect(iptablesHasWriteArg("iptables -L -n")).toBe(false);
    });

    it("should allow iptables -L -n with 2>/dev/null redirection", () => {
      expect(iptablesHasWriteArg("iptables -L -n 2>/dev/null")).toBe(false);
    });

    it("should allow iptables -L -n with > /dev/null redirection", () => {
      expect(iptablesHasWriteArg("iptables -L -n > /dev/null")).toBe(false);
    });

    it("should allow iptables -L -n with >> file redirection", () => {
      expect(iptablesHasWriteArg("iptables -L -n >> /tmp/output")).toBe(false);
    });

    it("should allow iptables -L -n with 2>&1 redirection", () => {
      expect(iptablesHasWriteArg("iptables -L -n 2>&1")).toBe(false);
    });

    it("should allow iptables -L -n with 1>&2 redirection", () => {
      expect(iptablesHasWriteArg("iptables -L -n 1>&2")).toBe(false);
    });

    it("should allow iptables -L -n -v", () => {
      expect(iptablesHasWriteArg("iptables -L -n -v")).toBe(false);
    });

    it("should allow iptables -L -n -v --line-numbers", () => {
      expect(iptablesHasWriteArg("iptables -L -n -v --line-numbers")).toBe(false);
    });

    it("should allow iptables -t filter -L -n", () => {
      expect(iptablesHasWriteArg("iptables -t filter -L -n")).toBe(false);
    });

    it("should allow iptables -L chain-name -n -v", () => {
      expect(iptablesHasWriteArg("iptables -L ufw-user-input -n -v")).toBe(false);
    });

    it("should allow iptables -L ufw-user-input -n -v --line-numbers", () => {
      expect(iptablesHasWriteArg("iptables -L ufw-user-input -n -v --line-numbers")).toBe(false);
    });

    it("should allow iptables -L -n with verbose flags", () => {
      expect(iptablesHasWriteArg("iptables -L -n -vv")).toBe(false);
      expect(iptablesHasWriteArg("iptables -L -n -vvv")).toBe(false);
    });

    it("should allow iptables -L -x (exact counters)", () => {
      expect(iptablesHasWriteArg("iptables -L -x -n")).toBe(false);
    });

    it("should allow iptables -L -a (packet counters)", () => {
      expect(iptablesHasWriteArg("iptables -L -a -n")).toBe(false);
    });

    it("should allow iptables -L -k (byte counters)", () => {
      expect(iptablesHasWriteArg("iptables -L -k -n")).toBe(false);
    });

    it("should allow iptables -L -g (goto)", () => {
      expect(iptablesHasWriteArg("iptables -L -g MYCHAIN")).toBe(false);
    });

    it("should allow iptables -L -j (jump target)", () => {
      expect(iptablesHasWriteArg("iptables -L -j ACCEPT")).toBe(false);
    });

    it("should allow iptables -L -c (counters)", () => {
      expect(iptablesHasWriteArg("iptables -L -c -n")).toBe(false);
    });

    it("should allow iptables -L -w (wait)", () => {
      expect(iptablesHasWriteArg("iptables -L -w -n")).toBe(false);
    });

    it("should allow iptables -L -W (wait-interval)", () => {
      expect(iptablesHasWriteArg("iptables -L -W 5 -n")).toBe(false);
    });

    it("should allow iptables -L -s (source)", () => {
      expect(iptablesHasWriteArg("iptables -L -s 192.168.1.0/24 -n")).toBe(false);
    });

    it("should allow iptables -L -d (destination)", () => {
      expect(iptablesHasWriteArg("iptables -L -d 10.0.0.1 -n")).toBe(false);
    });

    it("should allow iptables -L -p (protocol)", () => {
      expect(iptablesHasWriteArg("iptables -L -p tcp -n")).toBe(false);
    });

    it("should allow iptables -L -i (in-interface)", () => {
      expect(iptablesHasWriteArg("iptables -L -i eth0 -n")).toBe(false);
    });

    it("should allow iptables -L -o (out-interface)", () => {
      expect(iptablesHasWriteArg("iptables -L -o eth1 -n")).toBe(false);
    });

    it("should allow iptables -L -m (match module)", () => {
      expect(iptablesHasWriteArg("iptables -L -m state --state NEW -n")).toBe(false);
    });

    it("should allow iptables --list with long flags", () => {
      expect(iptablesHasWriteArg("iptables --list --line-numbers")).toBe(false);
    });

    it("should allow iptables --list-rules", () => {
      expect(iptablesHasWriteArg("iptables --list-rules")).toBe(false);
    });

    it("should allow iptables --check", () => {
      expect(iptablesHasWriteArg("iptables --check INPUT -p tcp --dport 22 -j ACCEPT")).toBe(false);
    });

    it("should allow iptables -h/--help", () => {
      expect(iptablesHasWriteArg("iptables -h")).toBe(false);
      expect(iptablesHasWriteArg("iptables --help")).toBe(false);
    });

    it("should allow iptables -V/--version", () => {
      expect(iptablesHasWriteArg("iptables -V")).toBe(false);
      expect(iptablesHasWriteArg("iptables --version")).toBe(false);
    });

    it("should allow iptables with --proto, --dport, --sport", () => {
      expect(iptablesHasWriteArg("iptables -L -p tcp --dport 80 -n")).toBe(false);
      expect(iptablesHasWriteArg("iptables -L -p tcp --sport 12345 -n")).toBe(false);
    });

    it("should allow iptables with --destination-port, --source-port", () => {
      expect(iptablesHasWriteArg("iptables -L --destination-port 443 -n")).toBe(false);
      expect(iptablesHasWriteArg("iptables -L --source-port 8080 -n")).toBe(false);
    });

    it("should allow iptables with --log-prefix, --log-level", () => {
      expect(iptablesHasWriteArg("iptables -L -j LOG --log-prefix 'IPT: ' --log-level info")).toBe(false);
    });

    it("should allow iptables with --comment", () => {
      expect(iptablesHasWriteArg("iptables -L -m comment --comment 'test rule' -n")).toBe(false);
    });

    it("should allow iptables with --tcp-flags, --syn, --icmp-type", () => {
      expect(iptablesHasWriteArg("iptables -L --tcp-flags FIN,SYN FIN,SYN -n")).toBe(false);
      expect(iptablesHasWriteArg("iptables -L --syn -n")).toBe(false);
      expect(iptablesHasWriteArg("iptables -L --icmp-type echo-request -n")).toBe(false);
    });

    it("should allow iptables -L -n with state match", () => {
      expect(iptablesHasWriteArg("iptables -L -m state --state ESTABLISHED,RELATED -n")).toBe(false);
    });
  });

  describe("write commands", () => {
    it("should block iptables -F (flush)", () => {
      expect(iptablesHasWriteArg("iptables -F")).toBe(true);
    });

    it("should block iptables -A (append)", () => {
      expect(iptablesHasWriteArg("iptables -A INPUT -j DROP")).toBe(true);
    });

    it("should block iptables -D (delete)", () => {
      expect(iptablesHasWriteArg("iptables -D INPUT 1")).toBe(true);
    });

    it("should block iptables -I (insert)", () => {
      expect(iptablesHasWriteArg("iptables -I INPUT 1 -j DROP")).toBe(true);
    });

    it("should block iptables -P (policy)", () => {
      expect(iptablesHasWriteArg("iptables -P INPUT DROP")).toBe(true);
    });

    it("should block iptables -Z (zero counters)", () => {
      expect(iptablesHasWriteArg("iptables -Z")).toBe(true);
    });

    it("should block iptables -N (new chain)", () => {
      expect(iptablesHasWriteArg("iptables -N MYCHAIN")).toBe(true);
    });

    it("should block iptables -X (delete chain)", () => {
      expect(iptablesHasWriteArg("iptables -X MYCHAIN")).toBe(true);
    });

    it("should block iptables -E (rename chain)", () => {
      expect(iptablesHasWriteArg("iptables -E OLD NEW")).toBe(true);
    });

    it("should block iptables with unknown flags", () => {
      expect(iptablesHasWriteArg("iptables -Z -F")).toBe(true);
      expect(iptablesHasWriteArg("iptables -A -D")).toBe(true);
    });
  });
});
