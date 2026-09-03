import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Permanent regression guard for the "one repository, one backend, one frontend"
// structural claim this project has re-verified by hand (via ad-hoc grep/find
// commands) across many separate audit cycles. Encodes those manual checks so
// future drift — a second .git, a second HTTP server, a duplicated app root —
// fails CI instead of waiting for the next manual audit.
//
// Until 2026-08-06 this repo genuinely had 2 frontends and 2 backend/server
// processes (navigator/, a merged-in standalone route-lookup app with zero
// links from the real product) and this guard carried an explicit exception
// for it. navigator/ was consolidated into the main app
// (backend/src/modules/app-navigator/, src/pages/AppNavigator.tsx) and
// deleted — the exceptions below are gone, not just narrowed, so a future
// re-introduction of a second frontend/backend fails this test with no
// carve-out to quietly widen.

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  'test-results',
  'logs',
  'agent-tools',
  'terminals',
]);
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
const ALLOWED_LISTEN_FILES = new Set(['backend/src/main.ts']);

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
    // [.-] not just \.: this repo also uses hyphenated suffixes -- NestJS e2e
    // specs are named *.e2e-spec.ts (backend/test/) and the Mongo-only backend
    // specs *.mongo-spec.ts. A dot-only pattern treated those as production
    // code, so moving an integration test onto the e2e harness made its
    // app.listen() read as a stray server.
    if (/[.-](test|spec)\.[jt]sx?$/.test(relPath)) continue;
    if (ALLOWED_LISTEN_FILES.has(relPath)) continue;
    const text = readFileSync(full, 'utf8');
    if (/\.listen\(/.test(text)) found.push(relPath);
  }
  return found;
}

// Every genuinely separate frontend build entry point in the repo, found by
// shape (index.html / vite.config* / webpack.config*) rather than by name —
// so a brand-new third frontend dropped in anywhere else gets caught instead
// of silently passing the way a fixed-path existsSync() check would.
const FRONTEND_ENTRY_PATTERN =
  /^(index\.html|vite\.config\.[cm]?[jt]s|webpack\.config\.[cm]?[jt]s)$/;

function findFrontendEntryPoints(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...findFrontendEntryPoints(full));
      continue;
    }
    if (!FRONTEND_ENTRY_PATTERN.test(entry)) continue;
    found.push(relative(REPO_ROOT, full).replace(/\\/g, '/'));
  }
  return found;
}

describe('repositoryStructureAudit', () => {
  it('has no nested .git directories anywhere except the repo root', () => {
    expect(findNestedGitDirs(REPO_ROOT)).toEqual([]);
  });

  it('has no HTTP .listen() calls outside the one real backend', () => {
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

  it('has no frontend build entry points beyond the one real app', () => {
    // A 2026-08-06 audit found the "exactly one frontend" claim above checks the
    // right path exists but never checks that nothing ELSE like it exists
    // anywhere else in the tree — this closes that gap by enumerating every
    // index.html/vite.config*/webpack.config* in the repo and asserting the set
    // is exactly the one real app's, not more.
    const found = findFrontendEntryPoints(REPO_ROOT).sort();
    expect(found).toEqual(['index.html', 'vite.config.ts'].sort());
  });
});
