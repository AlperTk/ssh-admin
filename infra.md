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
2. Whitelist'te varsa ama write pattern içeriyorsa → engelle
3. İkisi de geçerse → izin ver

### Tasarım Deseni: Singleton + Direct Dispatch + Early Exit
- **Whitelist**: `Set.has()` → O(1) lookup
- **Routing**: `Map.get(cmd)` → direkt handler'a (chain iteration yok)
- **I/O**: JSON bir kez constructor'da okunur, her check'te tekrar okunmaz
- **Regex**: Constructor'da derlenir, her check'te yeniden compile edilmez
- **Early exit**: Whitelist miss → hemen dön, daha fazla işlem yapılmaz

### Dosya Yapısı
```
src/readonly-checker.ts              ← export { CommandChecker, checker }
src/readonly-checker/
├── command-checker.ts               ← CommandChecker singleton (~120 satır)
│   ├── check(command)               ← ana kontrol akışı
│   ├── whitelist: Set<string>       ← O(1) lookup
│   ├── handlers: Map<string, Fn>    ← O(1) direct dispatch
│   └── patternDetector              ← write pattern detection
├── write-handlers/                  ← her komut tipi için write kontrolü
│   ├── git-handler.ts               ← git write komutları (commit, push, init...)
│   ├── docker-handler.ts            ← docker write subkomutları (rm, run, stop...)
│   ├── systemctl-handler.ts         ← systemctl write subkomutları (start, stop...)
│   ├── curl-wget-handler.ts         ← -o/-O output, -d/--data exfiltration
│   ├── ip-handler.ts                ← ip write subkomutları (add, del, flush...)
│   ├── apt-handler.ts               ← apt write komutları (install, remove...)
│   ├── crontab-handler.ts           ← -e flag (yazma)
│   ├── firewall-cmd-handler.ts      ← --list-* / --get-* hariç hepsi yazma
│   ├── rsync-handler.ts             ← her zaman yazma
│   └── mktemp-handler.ts            ← her zaman yazma
├── write-patterns/
│   └── write-pattern-detector.ts    ← redirection, interpreter writes, reverse shell
├── resolution/
│   └── command-resolver.ts          ← sudo/su/ssh peel-through
└── parsing/
    ├── loop-extractor.ts            ← for/while döngü gövdesi çıkarma
    └── substitution-detector.ts     ← $() ve backtick recursive check
src/data/
├── readonly-whitelist.json          ← whitelist komut listesi (491 komut)
└── readonly-rules.ts                ← GIT_WRITE_COMMANDS, DOCKER_READ_ONLY vb. sabitler
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
       3. handlers.get(cmd)?.hasWriteArg() → EVET ❌
       4. write pattern detector → EVET ❌
  → ✅ izin
```

### Hızlı Referans

#### Whitelist'e Komut Ekleme
1. `src/data/readonly-whitelist.json` → `commands` array'e ekle

#### Yeni Write Handler Ekleme
1. `src/readonly-checker/write-handlers/<name>-handler.ts` oluştur
2. Export: `export function hasWriteArg(cmd: string): boolean`
3. `command-checker.ts` Map'e kaydet

#### Hangi Dosyaya Bakmalı?
| İhtiyaç | Dosya |
|---|---|
| Whitelist güncelle | `src/data/readonly-whitelist.json` |
| Yeni komut write kontrolü | `write-handlers/` veya `write-patterns/` |
| Komut resolution (sudo/su/ssh) | `resolution/command-resolver.ts` |
| Loop/substitution parsing | `parsing/loop-extractor.ts`, `parsing/substitution-detector.ts` |
| Tüm write pattern kuralları | `write-patterns/write-pattern-detector.ts` |
| Sabitler (GIT_WRITE_COMMANDS vb.) | `src/data/readonly-rules.ts` |

### Testler
```bash
npm test              # 176 test
npm test -- src/readonly-checker.test.ts  # sadece checker (164 test)
```

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
