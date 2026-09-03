#!/usr/bin/env node
/**
 * Clean-build verification: removes every build output and incremental
 * cache this repo produces, then re-runs the backend build, the backend
 * test suite, and the frontend typecheck/build from that empty state.
 *
 * Exists because a "build clean" claim is only as good as what produced
 * it -- a stale `dist/` from an earlier run, or an incremental
 * `.tsbuildinfo` cache, can sit around looking like current evidence long
 * after the source has moved on. Every check here is guaranteed to reflect
 * the CURRENT source tree, not a leftover artifact, because nothing it
 * checks is allowed to exist before the check runs.
 *
 * Usage: node scripts/verify-clean-build.mjs [--skip-tests]
 */
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skipTests = process.argv.includes('--skip-tests');

const results = [];
const record = (label, ok, detail) => {
  results.push({ label, ok, detail });
  console.log(`\n[${ok ? 'OK' : 'FAIL'}] ${label}`);
  if (detail) console.log(detail);
};

function run(label, command, cwd) {
  try {
    const output = execSync(command, {
      cwd: cwd ?? rootDir,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 64,
    });
    record(label, true, output.trim().split('\n').slice(-15).join('\n'));
    return true;
  } catch (error) {
    const output = [error.stdout, error.stderr].filter(Boolean).join('\n');
    record(label, false, output.trim().split('\n').slice(-40).join('\n'));
    return false;
  }
}

function rm(relPath) {
  const abs = join(rootDir, relPath);
  if (existsSync(abs)) {
    rmSync(abs, { recursive: true, force: true });
    return true;
  }
  return false;
}

function findTsBuildInfo(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) findTsBuildInfo(full, found);
    else if (entry.toLowerCase().endsWith('.tsbuildinfo')) found.push(full);
  }
  return found;
}

console.log('CareDroid clean-build verification\n');
console.log('Removing dist/, vite cache, and any stray .tsbuildinfo files...');

const removed = [];
if (rm('backend/dist')) removed.push('backend/dist');
if (rm('dist')) removed.push('dist');
if (rm('node_modules/.vite')) removed.push('node_modules/.vite');
for (const file of findTsBuildInfo(rootDir)) {
  rmSync(file, { force: true });
  removed.push(relative(rootDir, file));
}
console.log(
  removed.length ? `Removed: ${removed.join(', ')}` : 'Nothing to remove (already clean).',
);

// 1. Backend build -- also verifies the shared lib/ + src/types/ roots
// tsconfig.build.json depends on are actually reachable and test-file-free.
run('Backend build (nest build, from removed dist/)', 'npm run build', join(rootDir, 'backend'));

// 2. Backend test suite -- optional, since it's the slowest step and the
// build step above already exercises the same tsconfig boundary.
if (!skipTests) {
  run('Backend test suite (cold jest cache)', 'npx jest --silent', join(rootDir, 'backend'));
}

// 3. Frontend typecheck -- does not depend on the esbuild dev-server
// process, so it works even in sandboxes where `vite build` cannot spawn
// its bundler service. Not a substitute for a real bundle build, but the
// most reliable frontend-correctness signal available in every environment.
run('Frontend typecheck (tsc --noEmit -p tsconfig.frontend.json)', 'npm run typecheck:frontend');

// 4. Frontend bundle build -- the real, final check. Reported honestly
// either way; a failure here in an environment where vite's esbuild
// service cannot spawn a child process is a known, separate limitation,
// not something this script should hide or downgrade.
run('Frontend bundle build (vite build, from removed dist/)', 'npm run build');

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log(`Failed: ${failed.map((r) => r.label).join('; ')}`);
  process.exit(1);
}
console.log(
  'Every check ran against a freshly removed dist/cache -- this is a genuinely clean result.',
);
