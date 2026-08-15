# ssh-admin — Development Info

MCP server for managing SSH servers. Provides host registry, session pool, and command execution tools.

## Setup
```bash
npm install
npm run dev    # watch mode via tsx
npm test       # vitest
npm run build  # bundle → dist/bundle.cjs
```

## Architecture
```
index.ts (entry point)
├── types.ts           → Shared type tanımları
├── tokenizer.ts       → Komut segment parsing (tokenize, getFirstToken)
├── tools/
│   ├── registry-tools.ts       ← registry MCP tool register'ları
│   ├── connection-tools.ts     ← connection MCP tool register'ları
│   ├── command-tools.ts        ← command_execute + command_execute_raw tool register'ları
│   ├── file-edit-tools.ts      ← file_edit tool (replace/range, temp yedek, diff, dryRun)
│   └── instruction-tools.ts    ← instruction tool (hardcoded content)
├── instruction-guard.ts      ← instruction tool enforcement (flag + requireInstruction)
├── pool.ts        → SSH session pool (ssh2 Client)
├── registry.ts    → Host registry (~/.ssh-admin/hosts.json, mtime-based cache)
├── readonly-guard.ts → Readonly mode flag (inject edilebilir)
├── response.ts    → successResponse, errorResponse, formatError
├── errors.ts      → AppError (tek custom error class)
├── readonly-checker.ts → Command whitelist + write pattern detection
├── log-changelog.ts → command_execute_raw changelog log (~/server-info/changelog.log, max 500 satır)
├── file-edit.ts     → file_edit shell komutu builder + envelope parser (replace/range, temp yedek)
├── readonly-checker/
│   ├── command-checker.ts       ← CommandChecker singleton
│   ├── write-handlers/
│   │   ├── base-handler.ts      ← shared parser utilities (getFirstToken, skipFlags)
│   │   ├── git-handler.ts       ← git READ_ONLY whitelist + config --global/--system/-f detection
│   │   ├── docker-handler.ts    ← docker DOCKER_READ_ONLY whitelist
│   │   ├── docker-exec-checker.ts ← docker exec içi write pattern + shell spawn detection (handler değil, checker modülü)
│   │   ├── systemctl-handler.ts ← systemctl SYSTEMCTL_READ_ONLY whitelist
│   │   ├── curl-wget-handler.ts ← curl safe flag whitelist, wget tüm HTTP/FTP engelle
│   │   ├── ip-handler.ts        ← ip IP_READ_ONLY + IP_READ_ONLY_SUBCOMMANDS whitelist
│   │   ├── apt-handler.ts       ← apt APT_READ_ONLY whitelist
│   │   ├── crontab-handler.ts   ← -e, -r, -R, - (stdin) + skipFlags sonrası - tespiti
│   │   ├── firewall-cmd-handler.ts ← --list-* / --get-* whitelist
│   │   ├── sysctl-handler.ts      ← -w flag engelle (kernel parametresi yazma)
│   │   ├── ar-handler.ts          ← her zaman yazma
│   │   ├── strip-handler.ts       ← her zaman yazma
│   │   ├── objcopy-handler.ts     ← her zaman yazma
│   │   ├── fail2ban-handler.ts    ← status/gettag read-only, diğerleri write
│   │   ├── journalctl-handler.ts ← JOURNALCTL_SAFE_FLAGS whitelist
│   │   ├── awk-handler.ts       ← AWK_SAFE_PATTERNS whitelist
│   │   ├── scp-handler.ts       ← scp user@host:/path pattern tespiti
│   │   ├── tar-handler.ts       ← tar create/extract/write/r/u detection + --warning= bypass tespiti
│   │   ├── partx-handler.ts     ← partx --show/-s read-only, diğerleri write
│   │   ├── kpartx-handler.ts    ← kpartx -l/-r read-only, diğerleri write
│   │   ├── dmsetup-handler.ts   ← dmsetup ls/info/status/table read-only, diğerleri write
│   │   ├── snap-handler.ts      ← snap list/info/find read-only, diğerleri write
│   │   ├── tune2fs-handler.ts   ← tune2fs -l read-only, diğerleri write
│   │   ├── ufw-handler.ts       ← ufw status/show/list read-only, diğerleri write
│   │   ├── iptables-handler.ts  ← short flag whitelist kontrolü + long flag IPTABLES_READ_ONLY
│   │   ├── scriptreplay-handler.ts ← her zaman read-only
│   │   └── partprobe-handler.ts ← partprobe -s/-d read-only, diğerleri write
│   ├── write-patterns/
│   │   └── write-pattern-detector.ts ← redirection, interpreter writes, reverse shell, /dev/null bypass
│   ├── resolution/
│   │   └── command-resolver.ts  ← sudo/su/ssh peel-through (-l/-L terminal flag desteği)
│   └── parsing/
│       ├── loop-extractor.ts    ← for/while döngü gövdesi çıkarma
│       └── substitution-detector.ts ← $() ve backtick recursive check
└── data/
    ├── readonly-whitelist.json  ← whitelist komut listesi (321 komut, dpkg/dpkg-query, mail/mailx/mutt/elm/pine, svn/hg/bzr, service/init/telinit/runlevel, bvi/hexedit, nc/ncat/netcat/socat kaldırıldı)
    └── readonly-rules.ts        ← GIT_READ_ONLY, DOCKER_READ_ONLY, JOURNALCTL_SAFE_FLAGS, AWK_SAFE_PATTERNS vb. whitelist sabitleri
```

## Pool API
- `pool.open(alias, timeout?)` → `{ sessionId, status, verified }` (async)
  - sessionId formatı: `<alias>-<uuid>` (örn: `prod-server-a1b2c3d4-e5f6-...`)
  - Password memory wipe: credentials.password immediate null yapılır
  - HostConfig.forceIPv4 desteklenir (default: false)
- `pool.close(sessionId)` → `{ success, message }`
- `pool.list()` → `SessionInfo[]`
- `pool.executeCommand(sessionId, command, timeout?)` → `{ stdout, stderr, exitCode, durationMs }` (async)
- `pool.getSessionInfo(sessionId)` → `{ alias, host, username } | null`
- `pool.getSessionCount()` → `number`
- `pool.closeAll()` → tüm session'ları kapatır (graceful shutdown için)

> `ConnectionPool` class export edildi — tool modülleri için tip parametresi olarak kullanılır.

## Registry API
- `addServer({ alias, host, port, username, authMethod, keyPath? })` → `HostConfig`
- `listServers()` → `ServerInfo[]` (no credentials, no keyPath)
- `getServer(alias)` → `HostConfig`
- `updateServer(alias, { username?, authMethod?, keyPath? })` → `HostConfig`
- `deleteServer(alias)` → void
- `resolveCredentials(alias, host)` → `{ key?: Buffer; password?: string }` (throws if password missing)
  - Key dosya okuma hatası try-catch ile yakalanır, anlamlı hata fırlatılır

> `ServerInfo` tipi `alias`, `host`, `port`, `username`, `authMethod` alanlarını içerir — `keyPath` gizlidir.

> `registry.ts` mtime-based cache kullanır — dosya değişmeden tekrar okuma yapmaz.

## File Edit API
`file_edit` tool — hedefli dosya düzenleme (tüm dosyayı yeniden yazmadan). `src/file-edit.ts` (builder + parser) + `src/tools/file-edit-tools.ts` (registration).

- **`mode="replace"`** — `find` → `replace` (tek satır, literal substring). `all=false` (default) ise tam 1 eşleşme ister; `all=true` tümünü değiştirir.
- **`mode="range"`** — `startLine..endLine` aralığını yeni `replace` içeriğiyle değiştirir (boş `replace` = satırları siler).
- **`dryRun=true`** — diff önizler, dosyaya yazmaz.
- **Yedek** — `$(mktemp -d)/<basename>.<ts>` (temp dizin; çalışma/knowledge dizinini kirletmez). Tam yol response'ta `backup` alanında döner.
- **Dönüş** — `{ changed, dryRun, count, backup, diff }`.
- **Güvenlik** — `requireInstruction()` guard, changelog log (`command_execute_raw` ile aynı model), user approval (write tool).
- **Mekanizma** — değerler base64 ile shell'e geçirilir (quote/escape güvenli); replace `perl \Q..\E` + `$ENV` ile literal yapılır; range `sed` head + `tail` splice ile inode koruyucu (`cat tmp > path`).

## Readonly Checker

### Ne Yapar?
`command_execute` tool'unda gelen komutu **her zaman** filtreler (env değişkenine bağımlı):
1. Komut whitelist'te yoksa → engelle
2. Handler whitelist'te yoksa → engelle
3. Write pattern tespit edilirse → engelle
4. Tüm kontroller geçerse → izin ver

### Tasarım Deseni: Singleton + Direct Dispatch + Early Exit + Whitelist-Only
- **Whitelist**: `Set.has()` → O(1) lookup
- **Handler Whitelist**: Her handler kendi safe flag/subcommand whitelist'ine sahiptir
- **Routing**: `Map.get(cmd)` → direkt handler'a (chain iteration yok)
- **I/O**: JSON bir kez constructor'da okunur, her check'te tekrar okunmaz
- **Regex**: Constructor'da derlenir, her check'te yeniden compile edilmez
- **Early exit**: Whitelist miss → hemen dön, daha fazla işlem yapılmaz
- **Whitelist-Only**: Bilinmeyen flag/subcommand → engelle (blacklist kaldırıldı)

### Dosya Yapısı
```
src/readonly-checker.ts              ← export { CommandChecker, checker }
src/readonly-checker/
├── command-checker.ts               ← CommandChecker singleton (214 satır)
│   ├── check(command)               ← ana kontrol akışı
│   ├── whitelist: Set<string>       ← O(1) lookup
│   ├── handlers: Map<string, Fn>    ← O(1) direct dispatch
│   └── patternDetector              ← write pattern detection
├── write-handlers/                  ← her komut tipi için whitelist kontrolü
│   ├── git-handler.ts               ← git READ_ONLY whitelist + config --global/--system/-f detection
│   ├── docker-handler.ts            ← docker DOCKER_READ_ONLY whitelist
│   ├── docker-exec-checker.ts       ← docker exec içi write pattern + shell spawn detection (handler değil, checker modülü)
│   ├── systemctl-handler.ts         ← systemctl SYSTEMCTL_READ_ONLY whitelist
│   ├── curl-wget-handler.ts         ← curl safe flag whitelist, wget tüm HTTP/FTP engelle
│   ├── ip-handler.ts                ← ip IP_READ_ONLY + IP_READ_ONLY_SUBCOMMANDS whitelist
│   ├── apt-handler.ts               ← apt APT_READ_ONLY whitelist
│   ├── crontab-handler.ts           ← -e, -r, -R, - (stdin) + skipFlags sonrası - tespiti
│   ├── firewall-cmd-handler.ts      ← --list-* / --get-* whitelist
│   ├── sysctl-handler.ts            ← -w flag engelle (kernel parametresi yazma)
│   ├── ar-handler.ts                ← her zaman yazma
│   ├── strip-handler.ts             ← her zaman yazma
│   ├── objcopy-handler.ts           ← her zaman yazma
│   ├── fail2ban-handler.ts          ← status/gettag read-only, diğerleri write
│   ├── journalctl-handler.ts        ← JOURNALCTL_SAFE_FLAGS whitelist
│   ├── awk-handler.ts               ← AWK_SAFE_PATTERNS whitelist
│   ├── scp-handler.ts               ← scp user@host:/path pattern tespiti
│   ├── tar-handler.ts               ← tar create/extract/write/r/u detection + --warning= bypass tespiti (whitelist)
│   ├── partx-handler.ts             ← partx --show/-s read-only, diğerleri write
│   ├── kpartx-handler.ts            ← kpartx -l/-r read-only, diğerleri write
│   ├── dmsetup-handler.ts           ← dmsetup ls/info/status/table read-only, diğerleri write
│   ├── snap-handler.ts              ← snap list/info/find read-only, diğerleri write
│   ├── tune2fs-handler.ts           ← tune2fs -l read-only, diğerleri write
│   ├── ufw-handler.ts               ← ufw status/show/list read-only, diğerleri write
│   ├── iptables-handler.ts          ← iptables -L/-S/-C read-only, diğerleri write
│   ├── scriptreplay-handler.ts      ← her zaman read-only
│   └── partprobe-handler.ts         ← partprobe -s/-d read-only, diğerleri write
├── write-patterns/
│   └── write-pattern-detector.ts    ← redirection, interpreter writes, reverse shell, xargs read-only detection
├── resolution/
│   └── command-resolver.ts          ← sudo/su/ssh peel-through
└── parsing/
    ├── loop-extractor.ts            ← for/while döngü gövdesi çıkarma
    └── substitution-detector.ts     ← $() ve backtick recursive check
src/data/
├── readonly-whitelist.json          ← whitelist komut listesi (321 komut, dpkg/dpkg-query, mail/mailx/mutt/elm/pine, svn/hg/bzr, service/init/telinit/runlevel, bvi/hexedit, nc/ncat/netcat/socat kaldırıldı)
└── readonly-rules.ts                ← GIT_READ_ONLY, DOCKER_READ_ONLY, JOURNALCTL_SAFE_FLAGS, AWK_SAFE_PATTERNS, PARTX_READ_ONLY, KPARTX_READ_ONLY, DMSETUP_READ_ONLY, SNAP_READ_ONLY, TUNE2FS_READ_ONLY, UFW_READ_ONLY, IPTABLES_READ_ONLY, PARTPROBE_READ_ONLY vb. whitelist sabitleri
```

### Kontrol Akışı
```
check(command)
  → substitution ($(), backtick) → recursive check
  → loop extraction (for/while) → recursive check
  → segment parsing (&&, ||, ;, |)
  → per segment:
       1. resolve (sudo/su/ssh peel)
       2. whitelist.has(cmd) → YOKSA ❌ early exit
       3. handlers.get(cmd)?.hasWriteArg() → EVET ❌ (whitelist kontrolü)
       4. write pattern detector → EVET ❌
  → ✅ izin
```

### Üç Katmanlı Koruma

Her komut üç katmanlı savunma ile filtrelenir:

| Katman | Açıklama | Örnek Engeller |
|---|---|---|
| **1. Whitelist** | Komut whitelist'de yoksa → engelle | python, node, perl, ruby, php, gdb, mount, screen, tmux, dd, zip, gzip, install, patch, ddrescue, mke2fs, resize2fs, btrfstune, snapshot, wall |
| **2. Write Argüman** | Komut whitelist'te olsa bile write flag → engelle | `tar cf`, `systemctl restart`, `docker run`, `git add`, `git config --global`, `curl -o`, `wget -O`, `scp`, `crontab -e`, `crontab -r`, `crontab -`, `sed -i`, `find -exec` |
| **3. Redirection** | Dosya yazma operatörleri → engelle | `>`, `>>`, `printf >`, `base64 >` |

**Sonuç**: Hiçbir bypass mümkün değil. Sunucuda kalıcı hiçbir değişiklik yapılamadı.

### Whitelist-Only Yaklaşımı
Her handler **whitelist** kullanır: sadece bilinen safe flag/subcommand'lar izinli, bilinmeyen her şey engellenir.

| Handler | Whitelist |
|---|---|
| git | `GIT_READ_ONLY[]` — log, diff, status, show... + `config --global/--system/-f` engelleme |
| docker | `DOCKER_READ_ONLY` set — ps, images, inspect... |
| systemctl | `SYSTEMCTL_READ_ONLY` set — status, is-active, list-units... |
| curl | `CURL_SAFE_FLAGS` set — -s, -v, -I, -w, --compressed... |
| wget | **Tüm HTTP/FTP çağrıları engellenir** (varsayılan dosya yazar) |
| ip | `IP_READ_ONLY` + `IP_READ_ONLY_SUBCOMMANDS` map |
| apt | `APT_READ_ONLY` set — list, show, search, check, autoremove... (update/upgrade/full-upgrade/dist-upgrade yazma için engellenir) |
| journalctl | `JOURNALCTL_SAFE_FLAGS` set — --no-pager, --lines, -f... |
| awk | `AWK_SAFE_PATTERNS[]` — print, printf, BEGIN, END... |
| tar | `TAR_SAFE_FLAGS` + create/extract detection |
| scp | `user@host:/path` pattern tespiti |
| sysctl | `-w` flag → engelle (kernel parametresi yazma) |
| ar | Her zaman yazma (archive oluşturur) |
| strip | Her zaman yazma (binary modifikasyon) |
| objcopy | Her zaman yazma (binary modifikasyon) |
| partx | `--show`, `-s` read-only, diğerleri write |
| kpartx | `-l`, `-r` read-only, diğerleri write |
| dmsetup | `ls`, `info`, `status`, `table` read-only, diğerleri write |
| snap | `list`, `info`, `find` read-only, diğerleri write |
| tune2fs | `-l` read-only, diğerleri write |
| ufw | `status`, `show`, `list` read-only, diğerleri write |
| iptables | `-L`, `-S`, `-C` read-only, diğerleri write |
| scriptreplay | Her zaman read-only |
| partprobe | `-s`, `-d` read-only, diğerleri write |

### Hata Mesajı Formatı (Debug Info)
```json
{
  "success": false,
  "error": "Write operation detected: Write pattern detected in command [check_layer=pattern] [resolved_command=awk] [original_command=awk '{print $1}' > /tmp/out] [handler=awk] [blocked_command=awk] [matched_rule=REDIR_STDOUT_RE] [matched_text=>] [segment=2] [pipe_segments=[awk '{print $1}', '> /tmp/out']]"
}
```

| Field | Açıklama |
|---|---|
| `check_layer` | Engelleme katmanı (`substitution`, `loop`, `whitelist`, `handler`, `pattern`) |
| `resolved_command` | `sudo/su/ssh` peel sonrası gerçek komut |
| `original_command` | Orijinal komut (recursive check için) |
| `handler` | Handler adı (örn: `git`, `docker`, `awk`) |
| `blocked_command` | Engellenen komut (örn: `awk`, `git`) |
| `matched_rule` | Tetiklenen kural adı (örn: `REDIR_STDOUT_RE`, `system()` call) |
| `matched_text` | Eşleşen metin (örn: `>`, `>>`, `system(`) |
| `segment` | Pipe chain'deki segment numarası |
| `pipe_segments` | Pipe zincirindeki tüm segment'ler |

### Hızlı Referans

#### Whitelist'e Komut Ekleme
1. `src/data/readonly-whitelist.json` → `commands` array'e ekle

#### Yeni Write Handler Ekleme
1. `src/readonly-checker/write-handlers/<name>-handler.ts` oluştur
2. **Whitelist yaklaşımı**: sadece bilinen safe flag/subcommand'ları izin ver
3. Export: `export function hasWriteArg(cmd: string): boolean`
4. `command-checker.ts` Map'e kaydet
5. Gerekirse `base-handler.ts`'den `getFirstToken`, `skipFlags` utility'lerini import et

#### Yeni Whitelist Sabiti Ekleme
1. `src/data/readonly-rules.ts` → yeni whitelist Set/Array ekle
2. İlgili handler'da kullan
3. `test/readonly-checker/write-handlers/<name>-handler.test.ts` → test ekle

#### Hangi Dosyaya Bakmalı?
| İhtiyaç | Dosya |
|---|---|
| Komut whitelist güncelle | `src/data/readonly-whitelist.json` |
| Yeni komut write kontrolü | `write-handlers/<name>-handler.ts` |
| Handler whitelist sabiti | `src/data/readonly-rules.ts` |
| Komut resolution (sudo/su/ssh) | `resolution/command-resolver.ts` |
| Loop/substitution parsing | `parsing/loop-extractor.ts`, `parsing/substitution-detector.ts` |
| Write pattern kuralları | `write-patterns/write-pattern-detector.ts` |

### Testler
```bash
npm test              # 509 test
```

#### Test Yapısı
```
test/
├── response.test.ts                    ← successResponse, errorResponse, formatError (AppError/Error/unknown)
├── readonly-guard.test.ts              ← setReadonlyMode, resetReadonlyMode, requireWrite/isReadonlyMode override
├── registry.test.ts                    ← registry API (add, list, get, update, delete, resolveCredentials)
├── pool.test.ts                        ← ConnectionPool (close, list, executeCommand, getSessionCount, getSessionInfo)
├── log-changelog.test.ts               ← buildChangelogCommand (timestamp, escaping, rotation, single-line)
├── file-edit.test.ts                   ← buildFileEditCommand (replace/range) + parseFileEditOutput (envelope)
├── tools/
│   ├── registry-tools.test.ts          ← 5 tool registration + schema doğrulama
│   ├── connection-tools.test.ts        ← 3 tool registration + schema doğrulama
│   ├── command-tools.test.ts           ← command_execute + command_execute_raw registration, schema, read-only redirect test
│   └── file-edit-tools.test.ts         ← file_edit registration, schema, guard, validation, changelog
└── readonly-checker/
    ├── command-checker.test.ts          ← ana check() akışı (whitelist, combined commands, write patterns)
    ├── write-handlers/
    │   ├── git-handler.test.ts          ← gitHasWriteArg (read/write alt komutlar)
    │   ├── docker-handler.test.ts       ← dockerHasWriteArg (namespace + action kontrolü)
    │   ├── systemctl-handler.test.ts    ← systemctlHasWriteArg (read-only set karşılaştırma)
    │   ├── curl-wget-handler.test.ts    ← curlWgetHasWriteArg (curl safe flag whitelist, wget tüm HTTP/FTP engelle)
    │   ├── ip-handler.test.ts           ← ipHasWriteArg (addr/link/route eylemleri)
    │   ├── apt-handler.test.ts          ← aptHasWriteArg (read-only vs write komutlar)
    │   ├── crontab-handler.test.ts      ← crontabHasWriteArg (-e, -r, -R, -, -u root - flag tespiti)
    │   ├── firewall-cmd-handler.test.ts ← --list-* / --get-* whitelist
    │   ├── sysctl-handler.test.ts       ← -w flag engelleme
    │   ├── ar-handler.test.ts           ← her zaman write (true döner)
    │   ├── strip-handler.test.ts        ← her zaman write (true döner)
    │   ├── objcopy-handler.test.ts      ← her zaman write (true döner)
    │   ├── fail2ban-handler.test.ts   ← fail2ban-client read-only subcommand whitelist
    │   ├── journalctl-handler.test.ts ← JOURNALCTL_SAFE_FLAGS whitelist
    │   ├── scp-handler.test.ts        ← scp user@host:/path pattern tespiti        ← tar create/extract/write/r/u detection + --warning= bypass tespiti
    ├── write-patterns/
    │   └── write-pattern-detector.test.ts ← redirection, interpreter writes, reverse shell
    ├── parsing/
    │   ├── loop-extractor.test.ts       ← for/while gövde çıkarma
    │   └── substitution-detector.test.ts ← $() ve backtick recursive check
    └── resolution/
        └── command-resolver.test.ts     ← sudo/su/ssh peel-through, getFirstToken
```

#### Test Çalıştırma
```bash
npm test                              # tüm testler (509)
npm test -- test/readonly-checker/    # readonly-checker modülü (341 test)
npm test -- test/pool.test.ts         # ConnectionPool (10 test: close, list, executeCommand, getSessionCount, closeAll, getSessionInfo)
npm test -- test/registry.test.ts     # Registry (12 test)
npm test -- test/response.test.ts     # response helpers (18 test)
npm test -- test/readonly-guard.test.ts # readonly guard (17 test)
npm test -- test/tools/               # tools modülleri (18 test)
npm test -- test/readonly-checker/write-handlers/git-handler.test.ts  # git handler (35 test)
```

#### Test Stratejisi
- **Integration testleri**: `command-checker.test.ts` — tam `check()` akışını whitelist + handler + pattern kombinasyonlarıyla test eder
- **Unit testleri**: Her handler kendi test dosyasında — `hasWriteArg(cmd)` fonksiyonunun doğru token'ı parse edip read/write kararını verdiğini doğrular
- **Alt modül testleri**: `write-pattern-detector`, `loop-extractor`, `substitution-detector`, `command-resolver` — bağımsız fonksiyonların doğru çalıştığını test eder

## Security Hardening (Güvenlik Güncellemeleri)

### Password Memory Wipe
`pool.open()` sırasında credentials.password immediate null yapılır — memory'de kalıcı kalmaz.
`InternalSession.authConfig` artık `{ keyPath?: string; hasPassword: boolean }` formatında.

### File Permissions
- Registry directory: `0700` (sadece owner)
- Registry file (`hosts.json`): `0600` (sadece owner okuyabilir/yazabilir)

### Command Validation
- `command_execute` tool'unda sessionId format validation (`<alias>-<uuid>` formatı)
- Docker exec: shell spawn detection (`bash/sh/zsh/csh/ksh/fish`)
- Tar: `-r/-u` flag detection + `--warning=` bypass tespiti
- Crontab: `-e`, `-r`, `-R`, `-` (stdin) + `-u root -` bypass write flag tespiti
- Apt: `update` komutu paket listesini günceller → yazma olarak engellendi
- Git config: `--global`, `--system`, `-f` flag tespiti → kalıcı yazma engellenir
- xargs curl/wget: handler dispatch'e yönlendirilir (flag-level kontrol)
- SCP: remote source/dest ayrımı güçlendirildi, `-i` flag atlatma

### IPv6 Desteği
`HostConfig.forceIPv4` optional field — default false. IPv6-only sunucular desteklenir.

## Readonly Mode
```bash
MCP_SSH_READONLY=true npm run dev
# veya
MCP_SSH_READONLY=true node dist/bundle.cjs
```

- Registry yazma tool'ları tamamen engellenir (`registry_add_server`, `registry_update_server`, `registry_delete_server`)
- `command_execute` whitelist + write pattern kontrolü **her zaman aktiftir** (env değişkenine bağımlı değildir)
- `readonly-guard.ts` → `setReadonlyMode(bool)` / `resetReadonlyMode()` export edildi (test için)

## Graceful Shutdown
SIGTERM ve SIGINT sinyalleri yakalanır — tüm SSH session'lar temiz kapanır:
```bash
# Server çalışırken:
kill -TERM <pid>   # SIGTERM → pool.closeAll() → process.exit(0)
kill -INT <pid>    # SIGINT → pool.closeAll() → process.exit(0)
```

## Error Handling
- `response.ts` → `formatError(err)` helper — `AppError` subclass'lardan `code` çıkarır
- `errors.ts` → `AppError` (tek custom error class)

## ~/server-info/ Yapısı

Her sunucunun `~/server-info/` dizininde kalıcı bilgiler tutulur. Bu dosyalar AI tarafından güncellenir ve okunur.

### Dosyalar

- **services.md** — Kurulu servisler ve durumları
- **packages.md** — Kurulu kritik paketler
- **rules.md** — Sunucu kısıtlamaları ve kuralları
- **decisions.md** — Alınan kararlar ve gerekçeleri
- **architecture.md** — Mimari notlar, yapılandırma detayları
- **changelog.log** — command_execute_raw ile çalıştırılan komutlar (otomatik append)

### Dizinler

- **knowledge/** — AI tarafından oluşturulan ve güncellenen bilgi dosyaları (.md)
  - Her .md dosyası bir konu/bilgi alanı temsil eder
  - AI, sunucu hakkında yeni bilgiler öğrendiğinde bu klasöre dosya ekler/günceller
- **scripts/** — Sık yapılan operasyonlar için yeniden kullanılabilir script'ler
  - Tekrarlayan görevleri hızlandırmak için otomasyon script'leri burada saklanır
  - AI, tekrarlanan operasyon kalıplarına göre script oluşturur ve günceller

### Maintain Kuralları (knowledge/ & scripts/)
Connect'te AI'a `~/server-info/`'un tree view'i verilir → **dosya isimleri keşif indeksidir**, anlamlı olmalı.

- **knowledge/**
  - Dosyayı konu/servise göre adlandır (Good: `postgres-pg16.md`, `nginx-reverse-proxy.md`; Bad: `notes.md`, `misc.md`). Bir dosya = bir konu.
  - **Sadece öz bilgi**: infer edilemeyen server-specific değerler (volume/mount path, network tipi/adı, port, versiyon, özel mimari kural/karar + gerekçe).
  - **Genel bilgi yazma**: teknolojinin ne olduğu, standart komutlar, AI'ın zaten bildiği hiçbir şey (örn. Dockerized servis için Docker'ı tanıtmak / `docker` komutları listelemek YOK).
  - Kısa bullet / key-value, prose değil. Sistem değişince ilgili dosyayı güncelle; çelişkiyi ekleme, eski bilgiyi değiştir.
- **scripts/**
  - Aynı çok-adımlı operasyonu birden fazla kez yapıyorsan script'e dök.
  - Verb-first isimlendir (Good: `rotate-logs.sh`, `backup-db.sh`; Bad: `doit.sh`, `temp.sh`).
  - Tek satır amaç yorumu ile başla; minimal + idempotent tut; benzeri varsa yenile, kopya üretme.

### Kullanım Kuralları

- **Okuma işlemleri:** `command_execute` kullanılır (whitelist + write pattern korumalı)
- **Kalıcı değişiklikler:** `command_execute_raw` kullanılır (filtresiz + user approval required)
  - Read-only komutlar `command_execute_raw` ile engellenir → `command_execute` kullanılmalı
- Dosyalar sistemde değişiklik olduğunda AI tarafından güncellenir
- AI, ihtiyaç duyduğunda bu dosyaları okuyarak sunucu hakkında bilgi alır
- **İlk adım:** Sunucuya bağlanıldığında `instruction` tool'u çağrılmalı

## Tools Modülleri
Tool register'ları `src/tools/` altında modülerleştirildi:

| Dosya | Sorumluluk |
|---|---|
| `tools/registry-tools.ts` | `registry_add_server`, `registry_list_servers`, `registry_get_server`, `registry_update_server`, `registry_delete_server` |
| `tools/connection-tools.ts` | `connection_open`, `connection_close`, `connection_list` |
| `tools/command-tools.ts` | `command_execute` (her zaman aktif whitelist + write pattern kontrolü), `command_execute_raw` (write komutlar, readonly check ile engelleme, changelog log) |
| `tools/file-edit-tools.ts` | `file_edit` (hedefli düzenleme: replace/range, temp yedek, diff, dryRun, changelog) |
| `tools/instruction-tools.ts` | `instruction` (hardcoded content, instruction guard flag set) |

Her modül `registerXxxTools(server, pool)` fonksiyonu export eder. `index.ts` sadece wire-up yapar.

## Configuration
- `"type": "module"` — ESM kullanıyor
- `tsconfig.json` → `strict: true`, `module: Node16`, `moduleResolution: Node16`
- `LICENSE` — MIT License dosyası mevcut

## Constraints
- Max 1 session per host (auto-reuse)
- Passwords from env: `SSH_PASSWORD_<ALIAS>`
- Default connection timeout: 5000ms
- Keepalive: interval = max(10s, timeout/3), count = 10
- Verification timeout: max(30s, timeout)
- Default command timeout: 60000ms
- Registry dir auto-created at `~/.ssh-admin/` (mode 0700)
- Registry file mode 0600 (sadece owner okuyabilir)
- `HostConfig.forceIPv4` optional — default false (IPv6 destekli)
- `command_execute` tool'unda sessionId format validation (`<alias>-<uuid>` formatı)
- `command_execute` whitelist + write pattern kontrolü **her zaman aktiftir** (MCP_SSH_READONLY env değişkenine bağımlı değildir)

## Changelog

### Session ID Formatı
- `pool.open()` → sessionId artık `<alias>-<uuid>` formatında (örn: `prod-server-a1b2c3d4-e5f6-...`)
- `src/pool.ts` → `crypto.randomUUID()` → `${alias}-${crypto.randomUUID()}`
- `src/tools/command-tools.ts` → UUID regex güncellendi: `^[a-zA-Z0-9_-]+-[0-9a-f]{8}-...` (prefix destekli)
- Test sessionId'leri prefix'li formata güncellendi
- Amaç: session prefix'i ile sunucu adı görünsün, debug ve izlenebilirlik artar

### Her Zaman Aktif Whitelist
- `command_execute` whitelist + write pattern kontrolü **her zaman aktiftir** — `MCP_SSH_READONLY` env değişkenine bağımlı değil
- `src/tools/command-tools.ts` → `isReadonlyMode()` kontrolü kaldırıldı, `checker.check()` her komut için çalışır
- `MCP_SSH_READONLY` artık sadece registry yazma tool'larını (`registry_add_server`, `registry_update_server`, `registry_delete_server`) engeller

### Raw Command Execute Tool
- `command_execute_raw` — whitelist ve write pattern kontrolleri olmadan komut çalıştırma
- Aynı parametreler: `sessionId`, `command`, `timeout`
- Açıklama: "Execute commands that modify the system — starting/stopping services, installing packages, modifying configs, creating files, etc. Use for any write or execute operation. For read-only operations (status checks, listing, viewing), use 'command_execute' instead."
- `checker.check()` çağrılmıyor, direkt `pool.executeCommand()`

### False Positive Düzeltmeleri
- `iptables -L -n` false positive düzeltildi — handler'a short flag whitelist kontrolü eklendi
- `sudo -l` false positive düzeltildi — resolver `-l`/`-L` terminal flag desteği kazandırdı
- `lastb` whitelist'e eklendi (failed login kayıtları okuma komutu)
- `2>/dev/null` false positive düzeltildi — WritePatternDetector `/dev/null` bypass desteği kazandırdı
- `command-checker.ts` satır sayısı: 206 → 214
- `CheckResult` interface'e debug alanları eklendi: `checkLayer`, `resolvedCommand`, `originalCommand`, `handlerName`, `pipeSegments`
- `command-tools.ts` gereksiz `?? 60000` fallback kaldırıldı (Zod `.default(60000)` yeterli)

### False Positive Düzeltmeleri (Devam)
- `ufw version` false positive düzeltildi — UFW_READ_ONLY'a `version` eklendi
- `containerd --version` false positive düzeltildi — `containerd` ve `ctr` whitelist'e eklendi
- `docker --version` false positive düzeltildi — handler'da sadece flag içenen komutlar read-only kabul edildi
- `iptables -L -n 2>/dev/null` false positive düzeltildi — handler'da redirection temizleme eklendi
- `iptables -L CHAIN` false positive düzeltildi — handler `-L/-S/-C` sonrası chain ismini kabul ediyor
- `iptables -t filter -L -n` false positive düzeltildi — handler `-t TABLE` sonrası devam ediyor
- IPTABLES_READ_ONLY'a yeni flag'lar eklendi: `-V/--version`, `--proto`, `--dport`, `--sport`, `--destination-port`, `--source-port`, `--log-prefix`, `--log-level`, `--log-tcp-options`, `--log-ip-options`, `--comment`

### Dead Code Temizliği
- `CRONTAB_WRITE_FLAGS`, `SHELL_PATTERNS`, `SCRIPTREPLAY_READ_ONLY` → `readonly-rules.ts`'den kaldırıldı (kullanılmıyordu)
- `skipLongFlags()` → `base-handler.ts`'den kaldırıldı (sadece `skipFlags()` içinde kullanılıyordu)
- `CheckFn`, `SubstitutionResult` → `substitution-detector.ts`'den export kaldırıldı (modül içi tip oldu)
- `validateEvalArgs()` → `command-checker.ts`'den kaldırıldı (çağrılmıyordu)
- 7 custom error sınıfı (`HostNotFoundError`, `SessionNotFoundError`, `ConnectionError`, `ReadOnlyViolationError`, `CredentialError`, `DuplicateHostError`, `InvalidUpdateError`) → `errors.ts`'den kaldırıldı (hiçbir yerde throw edilmiyordu)

### Güvenlik Güncellemeleri
- Whitelist'ten 20 tehlikeli komut kaldırıldı: `dpkg/dpkg-query`, `mail/mailx/mutt/elm/pine`, `svn/hg/bzr`, `service/init/telinit/runlevel`, `bvi/hexedit`, `nc/ncat/netcat/socat`
- `IPTABLES_READ_ONLY` → yazma flag'leri kaldırıldı (`-Z`, `-N`, `-F`, `-X`, `-P`, `-E`, `-A`, `-D`, `-I`, `-R`)
- `UFW_READ_ONLY` → yazma komutları kaldırıldı (`deny`, `allow`, `reject`, `delete`, `enable`, `disable`, `set`, `default`, `init`, `app update`, `app rev`)

### Kod Kalitesi
- `DOCKER_NAMESPACE_WRITE` → `DOCKER_NAMESPACE_ACTIONS` olarak yeniden adlandırıldı (isim yanıltıcıydı)
- `getFirstToken()`, `skipShortFlags()`, `skipFlags()` → tek kaynak `base-handler.ts`'e taşındı (önce 4 farklı kopya vardı)
- `journalctl-handler.ts` local `getFirstToken` silindi → `base-handler.ts`'den import
- `crontab-handler.ts` local `skipFlags` silindi → `base-handler.ts`'den `skipShortFlags` import
- `scriptreplayHasWriteArg(_cmd: string)` → argüman imzası düzeltildi (WriteHandlerFn tipi uyumu)
- Wget handler'a implicit blacklist dokümantasyonu eklendi
- ar/strip/objcopy handler'lara her zaman write nedeni dokümantasyonu eklendi

### Test Sayısı
- 425 → 414 (custom error sınıflarının testleri kaldırıldı)
- 414 → 465 (iptables handler 50 test + command_execute_raw 1 test)
- 465 → 476 (log-changelog 5 test + command_execute_raw changelog 3 test + getSessionInfo 2 test)
- 476 → 477 (command_execute_raw read-only redirect test)

### Raw Command Execute Changelog Logging
- `command_execute_raw` her komutta `~/server-info/changelog.log`'a kayıt yazar
- Format: `[YYYY-MM-DD HH:mm:ss] alias=<X> host=<Y> user=<Z> cmd='<komut>'`
- Tek satır format — komut içindeki newline karakterleri boşlukla değiştirilir
- Max 500 satır rotasyonu — `tail -n 500` ile eski kayıtlar otomatik temizlenir
- Non-blocking log — başarısız olsa bile komut çalışmaya devam eder
- Yeni dosyalar: `src/log-changelog.ts`, `test/log-changelog.test.ts`
- `pool.getSessionInfo(sessionId)` metodu eklendi — session alias/host/username döndürür

### Instruction Tool ve ~/server-info/ Yapısı
- `instruction` tool eklendi — `instruction.md` içeriğini döndürür
- `instruction.md` proje kökünde, build sırasında `dist/`'ye kopyalanır
- `~/server-info/` yapısı dokümante edildi (services.md, packages.md, rules.md, decisions.md, architecture.md, changelog.log)
- Kullanım kuralları belirlendi: okuma için `command_execute`, kalıcı değişiklik için `command_execute_raw` (user approval required)
- `build.mjs` — `instruction.md` kopyalama eklendi

### Instruction Enforcement
- `src/instruction-guard.ts` — yeni guard modülü
  - `_instructionCalled` flag (default false)
  - `setInstructionCalled()` — instruction tool çağrıldığında true yapar
  - `requireInstruction()` — false ise errorResponse döner, true ise null
- Tüm tool handler'lara `requireInstruction()` kontrolü eklendi:
  - `command_execute` — engeller
  - `command_execute_raw` — engeller
  - `registry_add_server` — engeller
  - `registry_list_servers` — engeller
  - `registry_get_server` — engeller
  - `registry_update_server` — engeller
  - `registry_delete_server` — engeller
  - `connection_open` — engeller
  - `connection_close` — engeller
  - `connection_list` — engeller
- `instruction` tool çağrıldığında flag true olur, sonraki tüm tool çağrıları geçer
- Testlere `resetInstructionCalled()` + `setInstructionCalled()` eklendi (beforeEach)

### Hardcoded Instruction Content
- `src/tools/instruction-tools.ts` — `instruction.md` dosyası yerine hardcoded template literal
- `fs` ve `path` importları kaldırıldı
- `INSTRUCTION_CONTENT` sabiti doğrudan içerik döndürür
- `build.mjs` — `instruction.md` kopyalama kaldırıldı
- `instruction.md` dosyası silindi

### command_execute_raw Read-Only Check
- `command_execute_raw` handler'a `checker.check(command)` eklendi
- Eğer komut read-only ise → "This is a read-only command. Please use 'command_execute' instead of 'command_execute_raw'." hatası
- Write komutlar → changelog log + execute devam eder
- Amaç: read-only işlemler için `command_execute_raw` kullanımını engelleme

### McpServer Instructions Field
- `McpServer` constructor'a `instructions` field eklendi
- Client initialization response'ında iletilir
- Client'lar bu instructions'ı okuyup otomatik action önerir

### Knowledge Base & Scripts Maintain Kuralları
- `INSTRUCTION_CONTENT`'a `## ~/server-info/ Maintenance` bölümü eklendi
- **knowledge/**: isimlendirme (konu/servis bazlı, good/bad örnekler), sadece öz bilgi (AI'ın bildiği yok, Docker örneğiyle), kısa bullet/key-value, güncelleme disiplini
- **scripts/**: tekrar eden çok-adımlı operasyonlar, verb-first isim, tek satır amaç yorumu, minimal/idempotent
- Neden: connect'te tree view verildiği için dosya ismi = keşif indeksi; context şişirmemek için içerik öz tutulmalı

### file_edit Tool
- Yeni tool: hedefli dosya düzenleme (tüm dosyayı yeniden yazmadan)
- `mode="replace"` (find→replace, literal, match-guard) + `mode="range"` (startLine..endLine → yeni içerik, boş = silme)
- `dryRun` önizleme, yedek **temp dizinde** (`$(mktemp -d)/<basename>.<ts>` — çalışma/knowledge dizinini kirletmez), unified diff dönüşü
- Değerler base64 ile shell'e; replace `perl \Q..\E`+`$ENV` literal; range `sed`+`tail` splice (inode koruyucu)
- `requireInstruction` guard + changelog log (readable summary) + user approval
- Yeni dosyalar: `src/file-edit.ts`, `src/tools/file-edit-tools.ts`, `test/file-edit.test.ts`, `test/tools/file-edit-tools.test.ts`
- `index.ts` wire-up; `File Editing Guidelines` → `file_edit` yönlendirmesi

### Test Sayısı (devam)
- 477 → 509 (file_edit: 20 builder/parser + 12 tool registration/behavior test)
