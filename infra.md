# mcp-ssh — Development Info

MCP server for managing SSH servers. Provides host registry (`~/.mcp-ssh/hosts.json`), session pool, and command execution tools.

## Setup
```bash
npm install
npm run dev    # watch mode via tsx
npm test       # vitest
```

## Architecture
```
index.ts (MCP tools) → pool.ts (SSH sessions) → ssh2 Client
                ↘ registry.ts (~/.mcp-ssh/hosts.json)
```

## Adding a New Tool
1. Define params in `server.tool()` call in `src/index.ts`
2. Use `pool.open()`, `pool.close()`, `pool.list()`, `pool.executeCommand()` for SSH ops
3. Use `addServer()`, `listServers()`, `getServer()`, `updateServer()`, `deleteServer()` for registry ops
4. Wrap errors: return `{ success: false, error }` with `isError: true`

## Pool API
- `pool.open(alias, timeout?)` → `{ sessionId, status }` (async)
- `pool.close(sessionId)` → `{ success, message }`
- `pool.list()` → `SessionInfo[]`
- `pool.executeCommand(sessionId, command, timeout?)` → `{ stdout, stderr, exitCode, durationMs }` (async)

## Registry API
- `addServer({ alias, host, port, username, authMethod, keyPath? })` → `HostConfig`
- `listServers()` → `HostConfig[]` (no credentials)
- `getServer(alias)` → `HostConfig`
- `updateServer(alias, { username?, authMethod?, keyPath? })` → `HostConfig`
- `deleteServer(alias)` → void
- `resolveCredentials(alias, host)` → `{ keyPath?, password? }` (throws if password missing)

## Types (src/types.ts)
- `HostConfig` — server config
- `SessionInfo` — active session metadata
- `CommandResult` — command output

## Readonly Mode

### Aktivasyon
```bash
MCP_SSH_READONLY=true npm run dev
# veya
MCP_SSH_READONLY=true node dist/bundle.js
```

opencode.json konfigürasyonu:
```json
{
  "mcp": {
    "ssh-admin": {
      "type": "local",
      "command": ["node", "/home/oem/workspace/ai/mcp/ssh-admin/dist/bundle.js"],
      "enabled": true,
      "env": {
        "MCP_SSH_READONLY": "true"
      }
    }
  }
}
```

### Davranış

**Registry yazma tool'ları — tamamen engellenir:**
- `registry_add_server` → `{ success: false, error: "Readonly mode is enabled..." }`
- `registry_update_server` → `{ success: false, error: "Readonly mode is enabled..." }`
- `registry_delete_server` → `{ success: false, error: "Readonly mode is enabled..." }`

**`command_execute` — agresif whitelist + write pattern tespiti:**
- Whitelist'te YOKSA → ENGELLE
- Whitelist'te VARSA ama write pattern varsa → ENGELLE
- İkisi de geçerse → İZİN VER

### Whitelist Komutları (`src/data/readonly-whitelist.json`)
`ls`, `cat`, `head`, `tail`, `grep`, `find`, `df`, `free`, `top`, `ps`, `uname`, `whoami`, `id`, `uptime`, `hostname`, `ping`, `curl`, `wget`, `netstat`, `ss`, `du`, `wc`, `sort`, `uniq`, `diff`, `file`, `stat`, `tar`, `unzip`, `base64`, `md5sum`, `sha256sum`, `awk`, `sed`, `echo`, `printf`, `env`, `printenv`, `which`, `whereis`, `man`, `info`, `type`, `compgen`, `declare`, `readonly`, `shopt`, `ulimit`, `umask`, `trap`, `jobs`, `history`, `alias`, `unalias`, `set`, `unset`, `cd`, `pwd`, `test`, `[`, `true`, `false`, `exit`, `return`, `break`, `continue`, `shift`, `wait`, `exec`, `eval`, `less`, `more`, `zcat`, `bzcat`, `zgrep`, `bzgrep`, `fgrep`, `egrep`, `tac`, `rev`, `nl`, `col`, `expand`, `unexpand`, `tr`, `cut`, `paste`, `join`, `comm`, `shuf`, `factor`, `seq`, `yes`, `stdbuf`, `timeout`, `nice`, `ionice`, `chroot`, `script`, `scriptreplay`, `tput`, `tset`, `stty`, `banner`, `cal`, `date`, `time`, `bc`, `dc`, `apropos`, `whatis`, `locate`, `mlocate`, `updatedb`, `ldd`, `objdump`, `nm`, `readelf`, `strings`, `size`, `strip`, `objcopy`, `as`, `ar`, `ranlib`, `addr2line`, `c++filt`, `gdb`, `gdbtui`, `cgdb`, `valgrind`, `strace`, `ltrace`, `lsof`, `fuser`, `lspci`, `lsusb`, `dmidecode`, `sensors`, `hdparm`, `smartctl`, `fdisk`, `parted`, `blkid`, `findmnt`, `mount`, `umount`, `dmesg`, `journalctl`, `systemctl`, `service`, `init`, `telinit`, `runlevel`, `who`, `w`, `last`, `lastlog`, `users`, `groups`, `su`, `sudo`, `getent`, `nscd`, `getconf`, `getopt`, `getopts`, `read`, `mapfile`, `source`, `.`, `export`, `local`, `typeset`, `popd`, `pushd`, `dirs`, `bind`, `builtin`, `caller`, `command`, `enable`, `help`, `logout`, `readlink`, `realpath`, `basename`, `dirname`, `mktemp`, `tty`, `mesg`, `wall`, `write`, `mail`, `mailx`, `mutt`, `elm`, `pine`, `pico`, `nano`, `vim`, `vi`, `emacs`, `ripgrep`, `rg`, `ag`, `pt`, `ack`, `git`, `svn`, `hg`, `bzr`, `patch`, `colordiff`, `wdiff`, `sdiff`, `icdiff`, `delta`, `difftastic`, `meld`, `kdiff3`, `tkdiff`, `xxd`, `hexdump`, `od`, `hex`, `hxd`, `bvi`, `hexedit`, `binwalk`, `foremost`, `scalpel`, `photorec`, `testdisk`, `ddrescue`, `rsync`, `scp`, `sftp`, `ssh`, `nc`, `ncat`, `netcat`, `socat`, `nmap`, `masscan`, `zmap`, `arping`, `etherwake`, `wakeonlan`, `iftop`, `nethogs`, `iptraf`, `vnstat`, `sar`, `iostat`, `mpstat`, `vmstat`, `pidstat`, `glances`, `htop`, `btop`, `bpytop`, `gotop`, `nvtop`, `nmon`, `sysstat`, `dstat`, `sysdig`, `perf`, `flamegraph`, `systemtap`, `bpftrace`, `bcc`, `ebpf`, `bpftool`, `opensnoop`, `execsnoop`, `biosnoop`, `filasnoop`, `tcplife`, `tcptracer`, `sslsnoop`, `runqslower`, `cachestat`, `cachetop`, `memleak`, `killsnoop`, `statsnoop`, `acceptsnoop`, `biosnap`, `filelife`, `fileslower`, `filetop`, `hardlinks`, `invisfiles`, `latemap`, `loadavg`, `mdflush`, `mountsnoop`, `oomkill`, `physmap`, `profile`, `runqlat`, `runqlen`, `slabratetop`, `slabtop`, `softirqs`, `syncsnoop`, `swapin`, `swapoff`, `swapon`, `tcpaccept`, `tcpconnect`, `tcpsmack`, `tcptop`, `tcpdrop`, `tcpretrans`, `tcpxmit`, `threadstuck`, `torvalds`, `unsnoop`, `virtfs`, `vmtouch`, `warm`, `xfsdump`, `zpool`, `zfs`, `zdb`, `zinject`, `zlist`, `btrfs`, `btrfstune`, `btrfsck`, `btrfs-ck`, `btrfs-find-root`, `btrfs-image`, `btrfs-inspect-internal`, `btrfs-map-logical`, `btrfs-zero-log`, `btrfs-restore`, `btrfs-send`, `btrfs-select-super`, `btrfs-show-super`, `btrfs-ssd`, `btrfs-tree-resolver`, `btrfs-uuid`, `btrfs-volume`, `btrfs-volume-label`, `xfs_admin`, `xfs_info`, `xfs_io`, `xfs_repair`, `xfs_fsr`, `xfs_db`, `xfs_growfs`, `xfs_freeze`, `xfs_quota`, `mke2fs`, `e2fsck`, `e2label`, `tune2fs`, `resize2fs`, `dump2fs`, `debugfs`, `e2image`, `e2undo`, `logsave`, `fsck.ext4`, `fsck.ext3`, `fsck.ext2`, `ntfsfix`, `ntfscluster`, `ntfsclone`, `ntfscompress`, `ntfsdecompress`, `ntfsinfo`, `ntfslabel`, `ntfsmove`, `ntfsresize`, `ntfssetattr`, `ntfssecaudit`, `ntfsusermap`, `ntfswipe`, `ntfs3format`, `ntfs3fix`, `f2fs_mkfs`, `f2fs_fsck`, `f2fs_convert`, `f2fs_dump`, `f2fs_info`, `f2fs_io`, `f2fs_label`, `f2fs_resize`, `f2fs_setattr`, `f2fs_wipe`, `dosfsck`, `fsck.vfat`, `mkfs.vfat`, `mkfs.msdos`, `mkfs.fat`, `fatlabel`, `findfs`, `lsblk`, `partprobe`, `partx`, `kpartx`, `dmsetup`, `lvm`, `vgscan`, `vgcfgbackup`, `vgcfgrestore`, `vgexport`, `vgimport`, `vgimportclone`, `vgmerge`, `vgsplit`, `vgchange`, `vgconvert`, `vgcreate`, `vgreduce`, `vgremove`, `vgrename`, `vgs`, `vgdisplay`, `pvscan`, `pvcreate`, `pvremove`, `pvmove`, `pvchange`, `pvdisplay`, `pvs`, `lvscan`, `lvcreate`, `lvremove`, `lvchange`, `lvdisplay`, `lvs`, `lvrename`, `lvextend`, `lvreduce`, `lvresize`, `lvsplit`, `lvmerge`, `lvconvert`, `snap`, `snapshot`, `mdadm`, `mdctl`, `mdmon`, `mdrun`, `mdstop`, `mdstart`, `mdassemble`, `mddump`, `mdtest`, `mdstat`, `mdcheck`

### Write Pattern Tespiti
| Pattern | Örnek | Durum |
|---------|-------|-------|
| `>` redirection | `echo x > file` | ❌ Engellendi |
| `>>` append | `echo x >> file` | ❌ Engellendi |
| `2>` stderr | `cmd 2> err.log` | ❌ Engellendi |
| `&>` combined | `cmd &> out.log` | ❌ Engellendi |
| `>(cmd)` process sub | `diff <(a) >(b)` | ❌ Engellendi |
| `<<<` here-string | `command <<< data` | ❌ Engellendi |
| `sed -i` in-place | `sed -i 's/x/y/g' f` | ❌ Engellendi |
| `sed "w /path"` write | `sed -n "w /tmp/f"` | ❌ Engellendi |
| `find -exec` | `find . -exec touch {} \;` | ❌ Engellendi |
| `xargs` arbitrary | `xargs rm` | ❌ Engellendi |
| `cp /dev/stdin` | `cp /dev/stdin /tmp/out` | ❌ Engellendi |
| `dd of=` | `dd if=/dev/zero of=/tmp/f` | ❌ Engellendi |
| `tar cf` create | `tar cf archive.tar .` | ❌ Engellendi |
| `python/perl/node + open(` | `python3 -c "open('/tmp/f','w')"` | ❌ Engellendi |
| `awk > "file"` print | `awk '{print $0 > "/tmp/f"}'` | ❌ Engellendi |
| `echo/cat/awk/tr/sort/uniq/grep.*>` | `cat file > /tmp/out` | ❌ Engellendi |

### Combined Command Desteği
- `&&` — `ls && cat file` → her segment kontrol edilir
- `\|\|` — `ls \|\| echo missing` → her segment kontrol edilir
- `;` — `ls; cat file` → her segment kontrol edilir
- `\|` pipe — `ls \| grep pattern` → her pipe segment kontrol edilir
- `()` subshell — `(ls; cat file)` → recursive kontrol
- `{}` brace — `{ ls; cat file }` → recursive kontrol
- `<>` process sub — `diff <(ls dir1) <(ls dir2)` → izin verilen okuma yönü

### Tehlikeli Komutlar (Whitelist'te YOK)
`rm`, `rmdir`, `cp`, `mv`, `ln`, `touch`, `chmod`, `chown`, `mkdir`, `dd`, `truncate`, `fallocate`, `apt`, `yum`, `dnf`, `pacman`, `pip`, `npm`, `gem`, `cargo`, `git commit/push/merge/reset --hard/clean`, `curl -o`, `wget -O`, `ssh` (remote exec), `sudo`, `su`, `install`, `uninstall`, `remove`, `delete`, `destroy`, `erase`, `wipe`, `shred`, `bash`, `sh`, `python`, `python3`, `perl`, `node`, `ruby`, `xargs`, `tee`, `col`

### systemctl Whitelist (read-only subkomutlar)
`systemctl` whitelist'de ama **sadece** aşağıdaki subkomutlar izinli:
- ✅ `status`, `is-active`, `is-enabled`, `is-failed`, `list-units`, `list-sockets`, `list-timers`, `list-dependencies`
- ✅ `cat`, `show`, `get-default`, `help`, `dump`, `import-environment`, `tmpfiles`, `property`, `daemon-status`, `log`, `is-system-running`
- ❌ `edit`, `start`, `stop`, `restart`, `reload`, `enable`, `disable`, `mask`, `unmask`, `kill`, `daemon-reload`, `reboot`, `poweroff`, `halt`, `shutdown`, `rescue`, `emergency`
- ⚠️ `sudo systemctl status sshd` → desteklenir (sudo prefix atlanır)

### Testler
```bash
npm test
# 66 test — allowed commands, blocked commands, combined commands, write patterns, systemctl whitelist, bypass detection
```

## Constraints
- Max 1 session per host (auto-reuse)
- Passwords from env: `SSH_PASSWORD_<ALIAS>`
- Default connection timeout: 5000ms (configurable via `timeout` param)
- Keepalive: interval = max(10s, timeout/3), count = 10
- Verification timeout: max(30s, timeout)
- Default command timeout: 60000ms
- Registry dir auto-created at `~/.mcp-ssh/`
