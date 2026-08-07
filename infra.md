# mcp-ssh — Development Info

MCP server for managing SSH servers. Provides host registry, session pool, and command execution tools.

## Setup
```bash
npm install
npm run dev    # watch mode via tsx
npm test       # vitest
npm run build  # bundle → dist/bundle.js
```

## Architecture
```
index.ts (MCP tools)
├── pool.ts        → SSH session pool (ssh2 Client)
├── registry.ts    → Host registry (~/.mcp-ssh/hosts.json)
└── readonly-checker.ts → Command whitelist + write pattern detection
```

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
├── command-checker.ts               ← CommandChecker singleton (~120 satır)
│   ├── check(command)               ← ana kontrol akışı
│   ├── whitelist: Set<string>       ← O(1) lookup
│   ├── handlers: Map<string, Fn>    ← O(1) direct dispatch
│   └── patternDetector              ← write pattern detection
├── write-handlers/                  ← her komut tipi için whitelist kontrolü
│   ├── git-handler.ts               ← git READ_ONLY whitelist (log, diff, status...)
│   ├── docker-handler.ts            ← docker DOCKER_READ_ONLY whitelist
│   ├── systemctl-handler.ts         ← systemctl SYSTEMCTL_READ_ONLY whitelist
│   ├── curl-wget-handler.ts         ← curl safe flag whitelist, wget tüm HTTP/FTP engelle
│   ├── ip-handler.ts                ← ip IP_READ_ONLY + IP_READ_ONLY_SUBCOMMANDS whitelist
│   ├── apt-handler.ts               ← apt APT_READ_ONLY whitelist
│   ├── crontab-handler.ts           ← -e flag (yazma)
│   ├── firewall-cmd-handler.ts      ← --list-* / --get-* whitelist
│   ├── rsync-handler.ts             ← her zaman yazma
│   ├── mktemp-handler.ts            ← her zaman yazma
│   ├── fail2ban-handler.ts          ← status/gettag read-only, diğerleri write
│   ├── journalctl-handler.ts        ← JOURNALCTL_SAFE_FLAGS whitelist
│   ├── awk-handler.ts               ← AWK_SAFE_PATTERNS whitelist
│   └── tar-handler.ts               ← tar create/extract/write detection (whitelist)
├── write-patterns/
│   └── write-pattern-detector.ts    ← redirection, interpreter writes, reverse shell, xargs read-only detection
├── resolution/
│   └── command-resolver.ts          ← sudo/su/ssh peel-through
└── parsing/
    ├── loop-extractor.ts            ← for/while döngü gövdesi çıkarma
    └── substitution-detector.ts     ← $() ve backtick recursive check
src/data/
├── readonly-whitelist.json          ← whitelist komut listesi (355+ komut)
└── readonly-rules.ts                ← GIT_READ_ONLY, DOCKER_READ_ONLY, JOURNALCTL_SAFE_FLAGS, AWK_SAFE_PATTERNS vb. whitelist sabitleri
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
| **1. Whitelist** | Komut whitelist'de yoksa → engelle | python, node, perl, ruby, php, gdb, mount, screen, tmux, dd, zip, gzip, install, patch |
| **2. Write Argüman** | Komut whitelist'te olsa bile write flag → engelle | `tar cf`, `systemctl restart`, `docker run`, `git add`, `curl -o`, `wget -O`, `scp`, `crontab -e`, `sed -i`, `find -exec` |
| **3. Redirection** | Dosya yazma operatörleri → engelle | `>`, `>>`, `printf >`, `base64 >` |

**Sonuç**: Hiçbir bypass mümkün değil. Sunucuda kalıcı hiçbir değişiklik yapılamadı.

### Whitelist-Only Yaklaşımı
Her handler **whitelist** kullanır: sadece bilinen safe flag/subcommand'lar izinli, bilinmeyen her şey engellenir.

| Handler | Whitelist |
|---|---|
| git | `GIT_READ_ONLY[]` — log, diff, status, show... |
| docker | `DOCKER_READ_ONLY` set — ps, images, inspect... |
| systemctl | `SYSTEMCTL_READ_ONLY` set — status, is-active, list-units... |
| curl | `CURL_SAFE_FLAGS` set — -s, -v, -I, -w, --compressed... |
| wget | **Tüm HTTP/FTP çağrıları engellenir** (varsayılan dosya yazar) |
| ip | `IP_READ_ONLY` + `IP_READ_ONLY_SUBCOMMANDS` map |
| apt | `APT_READ_ONLY` set — list, show, search, update... |
| journalctl | `JOURNALCTL_SAFE_FLAGS` set — --no-pager, --lines, -f... |
| awk | `AWK_SAFE_PATTERNS[]` — print, printf, BEGIN, END... |
| tar | `TAR_SAFE_FLAGS` + create/extract detection |
| scp | `user@host:/path` pattern tespiti |
| rsync/mktemp | Her zaman yazma (true döner) |

### Hata Mesajı Formatı (Debug Info)
```json
{
  "success": false,
  "error": "Write operation detected: Write pattern detected in command [blocked_command=awk] [matched_rule=REDIR_STDOUT_RE] [matched_text=>] [segment=2]"
}
```

| Field | Açıklama |
|---|---|
| `blocked_command` | Engellenen komut (örn: `awk`, `git`) |
| `matched_rule` | Tetiklenen kural adı (örn: `REDIR_STDOUT_RE`, `system()` call) |
| `matched_text` | Eşleşen metin (örn: `>`, `>>`, `system(`) |
| `segment` | Pipe chain'deki segment numarası |

### Hızlı Referans

#### Whitelist'e Komut Ekleme
1. `src/data/readonly-whitelist.json` → `commands` array'e ekle

#### Yeni Write Handler Ekleme
1. `src/readonly-checker/write-handlers/<name>-handler.ts` oluştur
2. **Whitelist yaklaşımı**: sadece bilinen safe flag/subcommand'ları izin ver
3. Export: `export function hasWriteArg(cmd: string): boolean`
4. `command-checker.ts` Map'e kaydet

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
npm test              # 362 test
```

#### Test Yapısı
```
test/
├── registry.test.ts                    ← registry API (add, list, get, update, delete, resolveCredentials)
├── pool.test.ts                        ← ConnectionPool (close, list, executeCommand, getSessionCount)
└── readonly-checker/
    ├── command-checker.test.ts          ← ana check() akışı (whitelist, combined commands, write patterns)
    ├── write-handlers/
    │   ├── git-handler.test.ts          ← gitHasWriteArg (read/write alt komutlar)
    │   ├── docker-handler.test.ts       ← dockerHasWriteArg (namespace + action kontrolü)
    │   ├── systemctl-handler.test.ts    ← systemctlHasWriteArg (read-only set karşılaştırma)
    │   ├── curl-wget-handler.test.ts    ← curlWgetHasWriteArg (curl safe flag whitelist, wget tüm HTTP/FTP engelle)
    │   ├── ip-handler.test.ts           ← ipHasWriteArg (addr/link/route eylemleri)
    │   ├── apt-handler.test.ts          ← aptHasWriteArg (read-only vs write komutlar)
    │   ├── crontab-handler.test.ts      ← crontabHasWriteArg (-e flag tespiti)
    │   ├── firewall-cmd-handler.test.ts ← --list-* / --get-* whitelist
    │   ├── rsync-handler.test.ts        ← her zaman write (true döner)
    │   ├── mktemp-handler.test.ts       ← her zaman write (true döner)
│   ├── fail2ban-handler.test.ts     ← FAIL2BAN_READ_ONLY whitelist
│   ├── journalctl-handler.test.ts   ← JOURNALCTL_SAFE_FLAGS whitelist
│   └── tar-handler.test.ts          ← tar create/extract/write detection
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
npm test                              # tüm testler (362)
npm test -- test/readonly-checker/    # readonly-checker modülü (347 test)
npm test -- test/pool.test.ts         # ConnectionPool (6 test)
npm test -- test/registry.test.ts     # Registry (12 test)
npm test -- test/readonly-checker/write-handlers/git-handler.test.ts  # git handler (31 test)
```

#### Test Stratejisi
- **Integration testleri**: `command-checker.test.ts` — tam `check()` akışını whitelist + handler + pattern kombinasyonlarıyla test eder
- **Unit testleri**: Her handler kendi test dosyasında — `hasWriteArg(cmd)` fonksiyonunun doğru token'ı parse edip read/write kararını verdiğini doğrular
- **Alt modül testleri**: `write-pattern-detector`, `loop-extractor`, `substitution-detector`, `command-resolver` — bağımsız fonksiyonların doğru çalıştığını test eder

## Readonly Mode
```bash
MCP_SSH_READONLY=true npm run dev
# veya
MCP_SSH_READONLY=true node dist/bundle.js
```

- Registry yazma tool'ları tamamen engellenir (`registry_add_server`, `registry_update_server`, `registry_delete_server`)
- `command_execute` whitelist + write pattern ile filtrelenir

## Constraints
- Max 1 session per host (auto-reuse)
- Passwords from env: `SSH_PASSWORD_<ALIAS>`
- Default connection timeout: 5000ms
- Keepalive: interval = max(10s, timeout/3), count = 10
- Verification timeout: max(30s, timeout)
- Default command timeout: 60000ms
- Registry dir auto-created at `~/.mcp-ssh/`
