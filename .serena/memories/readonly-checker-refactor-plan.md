## Refactoring Plan for readonly-checker.ts

### Architecture: Singleton + Direct Dispatch + Early Exit

```
CommandChecker (singleton)
  ├── whitelist: Set<string> (O(1) lookup)
  ├── handlers: Map<string, WriteHandlerFn> (direct dispatch)
  ├── compiled regex (constructor-time)
  └── check(command): Result
       ├── substitution detection → recursive
       ├── loop extraction → recursive
       ├── segment parsing → tokenizer
       └── per segment:
            ├── resolve command (sudo/su/ssh)
            ├── whitelist.has(cmd) → early exit if false
            ├── handlers.get(cmd)?.hasWriteArg()
            └── write pattern detector
```

### Key Design Decisions
- **Singleton**: CommandChecker created once, whitelist loaded once from disk
- **Direct dispatch**: Map.get(cmd) → handler function (no iteration)
- **Early exit**: whitelist miss = immediate block, no further processing
- **Compiled regex**: All regex compiled in constructor, reused across checks
- **Function handlers**: Not classes — no instantiation overhead, no prototype lookup
- **tokenizer.ts reuse**: Use existing tokenize() for segment/pipe parsing

### File Structure
```
src/
├── readonly-checker.ts              ← export { CommandChecker, checker }
├── readonly-checker/
│   ├── rules.ts                     ← all constants + compiled regex
│   ├── write-handlers/
│   │   ├── docker-handler.ts
│   │   ├── git-handler.ts
│   │   ├── systemctl-handler.ts
│   │   ├── curl-wget-handler.ts
│   │   ├── ip-handler.ts
│   │   ├── apt-handler.ts
│   │   └── crontab-handler.ts
│   ├── write-patterns/
│   │   └── write-pattern-detector.ts
│   ├── resolution/
│   │   └── command-resolver.ts
│   └── parsing/
│       ├── loop-extractor.ts
│       └── substitution-detector.ts
└── data/
    ├── readonly-whitelist.json      ← existing
    └── readonly-rules.ts            ← constants moved here
```

### Handler Interface
```typescript
type WriteHandlerFn = (cmd: string) => boolean;
// true = has write arg (block), false = no write (allow)
```

### Test Coverage (from readonly-checker.test.ts)
- ~460 test cases covering:
  - Allowed commands (whitelist)
  - Blocked commands (non-whitelist)
  - Combined commands (&&, ||, ;, pipe, subshell, brace)
  - Write patterns (redirection, sed -i, find -exec, xargs, tar create, dd, interpreter writes, reverse shell)
  - Command substitution ($(), backtick)
  - eval/exec validation
  - Git write detection
  - Docker read/write subcommands
  - systemctl read/write subcommands
  - False positive prevention (quoted strings, 2>/dev/null, etc.)