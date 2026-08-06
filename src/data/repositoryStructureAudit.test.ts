import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Permanent regression guard for the "one repository, one backend, one frontend"
// structural claim this project has re-verified by hand (via ad-hoc grep/find
// commands) across many separate audit cycles. Encodes those manual checks so
// future drift — a second .git, a second HTTP server, a duplicated app root —
// fails CI instead of waiting for the next manual audit.

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', 'test-results', 'logs', 'agent-tools', 'terminals']);
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

function findNestedGitDirs(dir: string, depth = 0): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry === '.git') {
      if (depth > 0) found.push(full);
      continue;
    }
    found.push(...findNestedGitDirs(full, depth + 1));
  }
  return found;
}

// Real production HTTP servers only — test files start throwaway servers for
// integration tests, which is expected and not a second production backend.
const ALLOWED_LISTEN_FILES = new Set([
  'backend/src/main.ts',
  'navigator/src/server.js',
]);

function findStrayListenCalls(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...findStrayListenCalls(full));
      continue;
    }
    if (!SOURCE_EXTENSIONS.some((ext) => entry.endsWith(ext))) continue;
    const relPath = relative(REPO_ROOT, full).replace(/\\/g, '/');
    if (/\.(test|spec)\.[jt]sx?$/.test(relPath)) continue;
    if (ALLOWED_LISTEN_FILES.has(relPath)) continue;
    const text = readFileSync(full, 'utf8');
    if (/\.listen\(/.test(text)) found.push(relPath);
  }
  return found;
}

describe('repositoryStructureAudit', () => {
  it('has no nested .git directories anywhere except the repo root', () => {
    expect(findNestedGitDirs(REPO_ROOT)).toEqual([]);
  });

  it('has no HTTP .listen() calls outside the one real backend and the disclosed navigator/ companion', () => {
    expect(findStrayListenCalls(REPO_ROOT)).toEqual([]);
  });

  it('has exactly one backend entrypoint and one frontend Vite app at the expected canonical paths', () => {
    expect(existsSync(join(REPO_ROOT, 'backend/src/main.ts'))).toBe(true);
    expect(existsSync(join(REPO_ROOT, 'vite.config.ts'))).toBe(true);
    expect(existsSync(join(REPO_ROOT, 'index.html'))).toBe(true);
    // The legacy bare-Express router (routes-registry.ts) was fully decommissioned
    // in an earlier campaign cycle — if it ever comes back, that's a second routing
    // authority, not a refactor.
    expect(existsSync(join(REPO_ROOT, 'backend/src/api/routes-registry.ts'))).toBe(false);
  });
});
