# Agent Guidelines

## Code Quality Principles

### SOLID

**Single Responsibility** — Each module owns exactly one concern. Separate business logic from infrastructure concerns. Entry points (e.g., `index.ts`, `main.ts`) should only wire components together — no domain logic.

**Open/Closed** — Extend behavior without modifying existing modules. New features → new files/functions. New rules/patterns → extend arrays or strategy methods, not inline conditionals.

**Liskov Substitution** — All implementations of an interface must behave consistently. Functions that throw on failure must use a consistent error shape. Stateful components must maintain invariants regardless of implementation.

**Interface Segregation** — Keep interfaces narrow. Types should not include transient fields (e.g., passwords resolved at runtime). Separate read-only views from mutable configs.

**Dependency Inversion** — High-level modules depend on abstractions (exported functions/interfaces), not concrete implementations. Define interfaces before introducing new data sources or transport layers.

### DRY

Eliminate repetition in these areas:
- **Error responses**: Extract helpers for common response shapes (`errorResponse(message)`, `successResponse(data)`).
- **Data access**: Centralize I/O through dedicated repository/service modules. Never access filesystems or databases directly from handlers.
- **Parsing/tokenization**: Shared parsing logic belongs in utility modules, duplicated across handlers.
- **Validation**: Common validation patterns → shared validators, not inline checks.

### KISS & YAGNI

- Prefer simple conditionals over complex abstraction layers.
- Only add abstractions when a third similar case appears.
- Use `unknown` with type guards instead of `any` when the shape is dynamic.
- Don't add configuration, layers, or patterns "just in case."

---

## Design Patterns

### Singleton / Module Pattern
Shared state that must be global within a process → export a single instance. Do not create multiple instances. Document this explicitly.

### Strategy Pattern
When behavior varies by rule/pattern/category → encapsulate each variant as a separate method/function. The orchestrator stays thin; strategies do the work. Add new strategies as new methods, not by growing the orchestrator.

### Factory Pattern
Object creation that depends on configuration or external data → factory function. Extend factories for new variants rather than adding conditional construction logic at call sites.

### Observer Pattern
Event-driven state management → use event listeners/emitters. Keep handlers focused and avoid side effects outside the owning module. Clean up listeners on teardown.

### Repository Pattern
Data persistence → dedicated repository/service module. All CRUD goes through its exported functions. Consumers never access storage directly.

---

## TypeScript Best Practices

### Type Safety
- Replace `any` with specific types or `unknown` + type guards.
- Use discriminated unions for error/success response shapes instead of optional fields.
- Enable `strict: true` in `tsconfig.json` and fix violations.

### Error Handling
- Define custom error classes for domain errors (e.g., `NotFoundError`, `ValidationError`).
- Use error codes or tags for structured error identification.
- Never swallow errors — log or propagate them.

### Schema Validation
- Keep schemas co-located with their input definitions.
- Document each parameter's purpose in `.describe()` calls.
- Use `.default()` sparingly — only for sensible fallbacks.

---

## Architecture Guidelines

### Adding a New Feature
1. Define types in the shared types file.
2. Implement business logic in the appropriate module.
3. Wire it in the entry point using existing APIs — never access storage or external services directly.
4. Wrap errors consistently: return `{ success: false, error }`.
5. If the feature affects safety modes (readonly, permissions), add validation in the relevant checker.

### Response Convention
```typescript
// Error
return {
  content: [{ type: "text", text: JSON.stringify({ success: false, error: "message" }) }],
  isError: true,
};

// Success
return {
  content: [{ type: "text", text: JSON.stringify({ success: true, data }, null, 2) }],
};
```

### Extension Points
- **Configuration flags**: Check mode flags at the top of handlers.
- **Rule sets**: Edit whitelist/blacklist arrays or pattern detectors.
- **Plugins/strategies**: Add new strategy implementations, not inline conditionals.

### State Lifecycle
- Document max instances per resource (e.g., 1 session per host).
- Auto-reuse where possible; clean up stale state automatically.
- Update usage metadata on each operation.

---

## Testing Guidelines

### Unit Tests
- Test each module independently. Reference patterns live in `*.test.ts` files alongside source modules.
- Mock external dependencies — do not test against real servers, databases, or filesystems.
- Aim for branch coverage on complex logic: every rule, every edge case, every bypass path.

### Test Categories
1. **Happy path** — verify expected behavior passes.
2. **Blocked/error cases** — verify failures are rejected correctly.
3. **Combined scenarios** — multi-step or chained operations.
4. **Edge cases** — empty input, boundary values, nested structures.
5. **Bypass detection** — ensure evasion attempts are caught.

### Running Tests
Run the project's test command (e.g., `npm test`, `pytest`).
