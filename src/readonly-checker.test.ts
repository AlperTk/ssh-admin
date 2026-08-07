import { describe, it, expect } from "vitest";
import { CommandChecker } from "./readonly-checker.js";

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
      expect(checker.check("wget https://example.com/file.tar.gz")).toEqual({ allowed: true });
      expect(checker.check("netstat -tlnp")).toEqual({ allowed: true });
      expect(checker.check("ss -tlnp")).toEqual({ allowed: true });
      expect(checker.check("du -sh /var/log")).toEqual({ allowed: true });
      expect(checker.check("wc -l file.txt")).toEqual({ allowed: true });
      expect(checker.check("sort file.txt")).toEqual({ allowed: true });
      expect(checker.check("uniq file.txt")).toEqual({ allowed: true });
      expect(checker.check("diff file1.txt file2.txt")).toEqual({ allowed: true });
      expect(checker.check("file /etc/passwd")).toEqual({ allowed: true });
      expect(checker.check("stat /etc/passwd")).toEqual({ allowed: true });
      expect(checker.check("tar xf archive.tar")).toEqual({ allowed: true });
      expect(checker.check("unzip archive.zip")).toEqual({ allowed: true });
      expect(checker.check("base64 file.txt")).toEqual({ allowed: true });
      expect(checker.check("md5sum file.txt")).toEqual({ allowed: true });
      expect(checker.check("sha256sum file.txt")).toEqual({ allowed: true });
      expect(checker.check("awk '{print $1}' file.txt")).toEqual({ allowed: true });
      expect(checker.check("sed 's/old/new/g' file.txt")).toEqual({ allowed: true });
      expect(checker.check("echo hello")).toEqual({ allowed: true });
      expect(checker.check("printf '%s' 'hello'")).toEqual({ allowed: true });
      expect(checker.check("env")).toEqual({ allowed: true });
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
      expect(checker.check("updatedb")).toEqual({ allowed: true });
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
      expect(checker.check("gdb --version")).toEqual({ allowed: true });
      expect(checker.check("valgrind --version")).toEqual({ allowed: true });
      expect(checker.check("strace -p 1234")).toEqual({ allowed: true });
      expect(checker.check("ltrace -p 1234")).toEqual({ allowed: true });
      expect(checker.check("lsof -p 1234")).toEqual({ allowed: true });
      expect(checker.check("fuser /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("lspci")).toEqual({ allowed: true });
      expect(checker.check("lsusb")).toEqual({ allowed: true });
      expect(checker.check("dmidecode -t memory")).toEqual({ allowed: true });
      expect(checker.check("sensors")).toEqual({ allowed: true });
      expect(checker.check("hdparm -I /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("smartctl -a /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("fdisk -l")).toEqual({ allowed: true });
      expect(checker.check("parted -l")).toEqual({ allowed: true });
      expect(checker.check("blkid")).toEqual({ allowed: true });
      expect(checker.check("findmnt")).toEqual({ allowed: true });
      expect(checker.check("mount")).toEqual({ allowed: true });
      expect(checker.check("umount /mnt")).toEqual({ allowed: true });
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
      expect(checker.check("mktemp")).toEqual({ allowed: true });
      expect(checker.check("tty")).toEqual({ allowed: true });
      expect(checker.check("mesg y")).toEqual({ allowed: true });
      expect(checker.check("wall 'hello'")).toEqual({ allowed: true });
      expect(checker.check("write user tty")).toEqual({ allowed: true });
      expect(checker.check("mail")).toEqual({ allowed: true });
      expect(checker.check("nano file.txt")).toEqual({ allowed: true });
      expect(checker.check("vim file.txt")).toEqual({ allowed: true });
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
      expect(checker.check("patch --dry-run < file.patch")).toEqual({ allowed: true });
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
      expect(checker.check("rsync -avz src/ dest/")).toEqual({ allowed: true });
      expect(checker.check("scp file user@host:/tmp/")).toEqual({ allowed: true });
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
      expect(checker.check("zpool status")).toEqual({ allowed: true });
      expect(checker.check("zfs list")).toEqual({ allowed: true });
      expect(checker.check("zdb /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("btrfs filesystem show")).toEqual({ allowed: true });
      expect(checker.check("btrfs filesystem df /mnt")).toEqual({ allowed: true });
      expect(checker.check("xfs_info /mnt")).toEqual({ allowed: true });
      expect(checker.check("xfs_db -r -c 'sb 0' -c 'p' /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("xfs_repair -n /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("e2fsck -n /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("tune2fs -l /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("debugfs -R 'ls -l /' /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("fsck.ext4 -n /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("ntfsfix /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("dosfsck -n /dev/sda1")).toEqual({ allowed: true });
      expect(checker.check("findfs LABEL=root")).toEqual({ allowed: true });
      expect(checker.check("lsblk")).toEqual({ allowed: true });
      expect(checker.check("partprobe")).toEqual({ allowed: true });
      expect(checker.check("partx --add /dev/sda")).toEqual({ allowed: true });
      expect(checker.check("kpartx -av /tmp/image.img")).toEqual({ allowed: true });
      expect(checker.check("dmsetup ls")).toEqual({ allowed: true });
      expect(checker.check("lvm pvs")).toEqual({ allowed: true });
      expect(checker.check("vgscan")).toEqual({ allowed: true });
      expect(checker.check("vgdisplay")).toEqual({ allowed: true });
      expect(checker.check("pvscan")).toEqual({ allowed: true });
      expect(checker.check("pvdisplay")).toEqual({ allowed: true });
      expect(checker.check("lvscan")).toEqual({ allowed: true });
      expect(checker.check("lvdisplay")).toEqual({ allowed: true });
      expect(checker.check("mdadm --detail /dev/md0")).toEqual({ allowed: true });
      expect(checker.check("mdadm --examine /dev/sda1")).toEqual({ allowed: true });
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
      expect(checker.check("(ls; cat file.txt)")).toEqual({ allowed: true });
      expect(checker.check("(ps aux; grep ssh)")).toEqual({ allowed: true });
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
  });
});
