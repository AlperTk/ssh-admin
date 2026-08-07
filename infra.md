# mcp-ssh — Development Info

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
│   ├── registry-tools.ts    ← registry MCP tool register'ları
│   ├── connection-tools.ts  ← connection MCP tool register'ları
│   └── command-tools.ts     ← command_execute tool register'ı
├── pool.ts        → SSH session pool (ssh2 Client)
├── registry.ts    → Host registry (~/.mcp-ssh/hosts.json, mtime-based cache)
├── readonly-guard.ts → Readonly mode flag (inject edilebilir)
├── response.ts    → successResponse, errorResponse, formatError
├── errors.ts      → AppError (tek custom error class)
├── readonly-checker.ts → Command whitelist + write pattern detection
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
│   │   ├── iptables-handler.ts  ← iptables -L/-S/-C read-only, diğerleri write
│   │   ├── scriptreplay-handler.ts ← her zaman read-only
│   │   └── partprobe-handler.ts ← partprobe -s/-d read-only, diğerleri write
│   ├── write-patterns/
│   │   └── write-pattern-detector.ts ← redirection, interpreter writes, reverse shell, xargs read-only detection
│   ├── resolution/
│   │   └── command-resolver.ts  ← sudo/su/ssh peel-through
│   └── parsing/
│       ├── loop-extractor.ts    ← for/while döngü gövdesi çıkarma
│       └── substitution-detector.ts ← $() ve backtick recursive check
└── data/
    ├── readonly-whitelist.json  ← whitelist komut listesi (320 komut, dpkg/dpkg-query, mail/mailx/mutt/elm/pine, svn/hg/bzr, service/init/telinit/runlevel, bvi/hexedit, nc/ncat/netcat/socat kaldırıldı)
    └── readonly-rules.ts        ← GIT_READ_ONLY, DOCKER_READ_ONLY, JOURNALCTL_SAFE_FLAGS, AWK_SAFE_PATTERNS vb. whitelist sabitleri
```

## Pool API
- `pool.open(alias, timeout?)` → `{ sessionId, status, verified }` (async)
  - Password memory wipe: credentials.password immediate null yapılır
  - HostConfig.forceIPv4 desteklenir (default: false)
- `pool.close(sessionId)` → `{ success, message }`
- `pool.list()` → `SessionInfo[]`
- `pool.executeCommand(sessionId, command, timeout?)` → `{ stdout, stderr, exitCode, durationMs }` (async)
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

## Readonly Checker

### Ne Yapar?
`command_execute` tool'unda gelen komutu filtreler:
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
├── readonly-whitelist.json          ← whitelist komut listesi (320 komut, dpkg/dpkg-query, mail/mailx/mutt/elm/pine, svn/hg/bzr, service/init/telinit/runlevel, bvi/hexedit, nc/ncat/netcat/socat kaldırıldı)
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

Read-only mode üç katmanlı savunma sağlar:

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
npm test              # 414 test
```

#### Test Yapısı
```
test/
├── response.test.ts                    ← successResponse, errorResponse, formatError (AppError/Error/unknown)
├── readonly-guard.test.ts              ← setReadonlyMode, resetReadonlyMode, requireWrite/isReadonlyMode override
├── registry.test.ts                    ← registry API (add, list, get, update, delete, resolveCredentials)
├── pool.test.ts                        ← ConnectionPool (close, list, executeCommand, getSessionCount)
├── tools/
│   ├── registry-tools.test.ts          ← 5 tool registration + schema doğrulama
│   ├── connection-tools.test.ts        ← 3 tool registration + schema doğrulama
│   └── command-tools.test.ts           ← command_execute registration + schema doğrulama
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
npm test                              # tüm testler (414)
npm test -- test/readonly-checker/    # readonly-checker modülü (341 test)
npm test -- test/pool.test.ts         # ConnectionPool (8 test: close, list, executeCommand, getSessionCount, closeAll)
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
- `command_execute` tool'unda sessionId UUID format validation mevcut
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
- `command_execute` whitelist + write pattern ile filtrelenir
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

## Tools Modülleri
Tool register'ları `src/tools/` altında modülerleştirildi:

| Dosya | Sorumluluk |
|---|---|
| `tools/registry-tools.ts` | `registry_add_server`, `registry_list_servers`, `registry_get_server`, `registry_update_server`, `registry_delete_server` |
| `tools/connection-tools.ts` | `connection_open`, `connection_close`, `connection_list` |
| `tools/command-tools.ts` | `command_execute` (readonly checker entegrasyonu dahil) |

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
- Registry dir auto-created at `~/.mcp-ssh/` (mode 0700)
- Registry file mode 0600 (sadece owner okuyabilir)
- `HostConfig.forceIPv4` optional — default false (IPv6 destekli)
- `command_execute` tool'unda sessionId UUID validation mevcut

## Changelog

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
