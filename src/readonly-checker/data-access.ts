import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Module-level cache — the whitelist file is read at most once per process.
let cachedWhitelist: Set<string> | null = null;

/**
 * Resolve the whitelist JSON path across source and bundle layouts.
 * __dirname is src/readonly-checker/ in source and dist/ in the bundle.
 */
function resolveWhitelistPath(): string | null {
  const candidates = [
    join(__dirname, 'data', 'readonly-whitelist.json'),
    join(__dirname, '..', 'data', 'readonly-whitelist.json'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function parseWhitelist(raw: string): Set<string> {
  const data = JSON.parse(raw) as { commands?: unknown };
  if (!Array.isArray(data.commands)) {
    throw new Error('whitelist JSON has no "commands" array');
  }
  return new Set(data.commands.filter((c): c is string => typeof c === 'string'));
}

function readWhitelist(): Set<string> {
  const path = resolveWhitelistPath();
  if (path === null) {
    console.warn('[readonly-checker] Whitelist file not found; falling back to an empty whitelist.');
    return new Set();
  }
  try {
    return parseWhitelist(readFileSync(path, 'utf-8'));
  } catch (err) {
    console.error(`[readonly-checker] Failed to load whitelist at ${path}: ${(err as Error).message}`);
    return new Set();
  }
}

/**
 * Load the read-only command whitelist, caching the result so the file is
 * read at most once. Returns an empty set (with a diagnostic) when the file
 * is missing or cannot be parsed, so callers never crash at import time.
 */
export function loadWhitelist(): Set<string> {
  if (cachedWhitelist !== null) return cachedWhitelist;
  cachedWhitelist = readWhitelist();
  return cachedWhitelist;
}
