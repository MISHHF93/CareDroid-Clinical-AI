#!/usr/bin/env node
/**
 * CareDroid doctor — diagnose local setup before you waste time on a failure
 * that is really a missing dependency or an occupied port.
 *
 * Read-only by design: it inspects, it never installs, migrates, or kills a
 * process. Every FAIL carries the actual command that fixes it, because
 * "something went wrong" costs more time than no check at all.
 *
 * Secrets rule: environment variables are reported by NAME and presence only.
 * No value from .env is ever read into the output.
 *
 * Run: npm run doctor
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];

function record(name, status, detail, fix) {
  results.push({ name, status, detail, fix });
}
const pass = (n, d) => record(n, 'PASS', d);
const warn = (n, d, f) => record(n, 'WARN', d, f);
const fail = (n, d, f) => record(n, 'FAIL', d, f);

function readJson(relPath) {
  try {
    return JSON.parse(readFileSync(join(ROOT, relPath), 'utf8'));
  } catch {
    return null;
  }
}

/** Compares a semver-ish version against a `>=x <y` range without a dependency. */
function satisfiesRange(version, range) {
  const nums = (v) => v.replace(/^[^\d]*/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const cmp = (a, b) => {
    for (let i = 0; i < 3; i += 1) {
      if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
    }
    return 0;
  };
  const actual = nums(version);
  return range
    .split(/\s+/)
    .filter(Boolean)
    .every((clause) => {
      const m = /^(>=|<=|>|<|\^|~)?(.*)$/.exec(clause);
      if (!m) return true;
      const [, op, target] = m;
      const want = nums(target);
      const c = cmp(actual, want);
      if (op === '>=') return c >= 0;
      if (op === '>') return c > 0;
      if (op === '<=') return c <= 0;
      if (op === '<') return c < 0;
      return true;
    });
}

/** Resolves once we know whether anything is accepting connections on the port. */
function probePort(port, timeoutMs = 700) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const done = (listening) => {
      socket.destroy();
      resolve(listening);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

/** Status plus parsed JSON body (null when the body is not JSON). */
async function httpJson(url, timeoutMs = 2500) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

async function httpStatus(url, timeoutMs = 2500) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.status;
  } catch {
    return 0;
  }
}

/** Names only. Never returns or logs a value. */
function envKeyNames(relPath) {
  try {
    return readFileSync(join(ROOT, relPath), 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('=')[0].trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ── toolchain ────────────────────────────────────────────────────────────────
const pkg = readJson('package.json');
const engines = pkg?.engines || {};

if (engines.node) {
  const v = process.versions.node;
  if (satisfiesRange(v, engines.node)) pass('NODE', `v${v} satisfies "${engines.node}"`);
  else
    fail(
      'NODE',
      `v${v} does not satisfy "${engines.node}"`,
      'Install a supported Node (nvm install 22 && nvm use 22), then re-run npm install.',
    );
} else {
  warn('NODE', `v${process.versions.node} (package.json declares no engines.node)`);
}

try {
  const npmVersion = execSync('npm -v', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  if (!engines.npm || satisfiesRange(npmVersion, engines.npm)) pass('NPM', `v${npmVersion}`);
  else fail('NPM', `v${npmVersion} does not satisfy "${engines.npm}"`, 'npm install -g npm@latest');
} catch {
  warn('NPM', 'npm not resolvable on PATH');
}

// ── install state ────────────────────────────────────────────────────────────
for (const [label, lock, modules, installDir] of [
  ['ROOT', 'package-lock.json', 'node_modules', '.'],
  ['BACKEND', 'backend/package-lock.json', 'backend/node_modules', 'backend'],
]) {
  const hasLock = existsSync(join(ROOT, lock));
  const hasModules = existsSync(join(ROOT, modules));
  if (!hasLock) {
    fail(`DEPS:${label}`, `${lock} is missing`, `cd ${installDir} && npm install`);
  } else if (!hasModules) {
    fail(
      `DEPS:${label}`,
      `${modules} is missing — nothing is installed`,
      `cd ${installDir} && npm ci`,
    );
  } else {
    pass(`DEPS:${label}`, 'lockfile and node_modules present');
  }
}

// Mixed package managers produce installs CI cannot reproduce.
const strayLocks = ['yarn.lock', 'pnpm-lock.yaml', 'backend/yarn.lock', 'backend/pnpm-lock.yaml'].filter((f) =>
  existsSync(join(ROOT, f)),
);
if (strayLocks.length) {
  fail(
    'PACKAGE-MANAGER',
    `this repository is npm (packageManager: ${pkg?.packageManager || 'npm'}), but found ${strayLocks.join(', ')}`,
    `Delete the stray lockfile(s) and reinstall with npm ci.`,
  );
} else {
  pass('PACKAGE-MANAGER', `npm only (${pkg?.packageManager || 'npm'})`);
}

// ── environment files ────────────────────────────────────────────────────────
for (const [label, envFile, exampleFile] of [
  ['ROOT', '.env', '.env.example'],
  ['BACKEND', 'backend/.env', 'backend/.env.example'],
]) {
  if (!existsSync(join(ROOT, exampleFile))) {
    warn(`ENV:${label}`, `${exampleFile} not found — cannot tell which variables are required`);
    continue;
  }
  if (!existsSync(join(ROOT, envFile))) {
    fail(`ENV:${label}`, `${envFile} is missing`, `cp ${exampleFile} ${envFile} and fill in the values.`);
    continue;
  }
  const required = envKeyNames(exampleFile);
  const present = new Set(envKeyNames(envFile));
  const missing = required.filter((k) => !present.has(k));
  if (missing.length) {
    // Names only — never the values.
    warn(
      `ENV:${label}`,
      `${missing.length} key(s) in ${exampleFile} absent from ${envFile}: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? ', …' : ''}`,
      `Add the missing keys to ${envFile} (names above; see ${exampleFile} for documentation).`,
    );
  } else {
    pass(`ENV:${label}`, `${required.length} documented keys all present`);
  }
}

// ── ports and services ───────────────────────────────────────────────────────
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || process.env.VITE_DEV_PORT || 3000);
const BACKEND_PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 8000);

const frontendUp = await probePort(FRONTEND_PORT);
const backendUp = await probePort(BACKEND_PORT);

if (backendUp) {
  const status = await httpStatus(`http://127.0.0.1:${BACKEND_PORT}/health`);
  if (status === 200) pass('BACKEND', `responding on :${BACKEND_PORT} (/health 200)`);
  else if (status === 0)
    fail(
      'BACKEND',
      `something holds :${BACKEND_PORT} but /health did not answer`,
      `Another process may own the port. Check it, then start the API with: npm run dev:api`,
    );
  else warn('BACKEND', `/health returned ${status} on :${BACKEND_PORT}`, 'Inspect the backend logs.');
} else {
  warn('BACKEND', `not running on :${BACKEND_PORT}`, 'Start it with: npm run dev:api  (or the full stack: npm run dev)');
}

// There is ONE dev user per database. POST /api/auth/dev-session persists
// whichever persona was switched to last -- by a developer, an agent or a
// Playwright probe -- and GET /api/profile/me then reports that persona to
// every dev session on the machine. Pages that render for a few seconds and
// then flip to "Access denied as registration-clerk" are this, not a race.
// The GET is read-only; doctor never signs in.
if (backendUp) {
  const { status, body } = await httpJson(`http://127.0.0.1:${BACKEND_PORT}/api/auth/dev-session`);
  if (status === 200 && body && body.exists === false) {
    pass('DEV PERSONA', 'no dev user bootstrapped yet (first dev sign-in creates it)');
  } else if (status === 200 && body && body.exists) {
    const persona = body.roleProfileId || '(none)';
    const when = body.personaUpdatedAt ? ` since ${new Date(body.personaUpdatedAt).toISOString()}` : '';
    pass(
      'DEV PERSONA',
      `shared dev user is role=${body.role} persona=${persona}${when}; every dev session here inherits it`,
    );
  } else if (status === 403) {
    pass('DEV PERSONA', 'dev sessions are disabled (production posture)');
  } else if (status === 404) {
    warn(
      'DEV PERSONA',
      'backend build predates GET /api/auth/dev-session',
      'Rebuild the API: npm --prefix backend run build  (the dev stack builds it once at start).',
    );
  } else {
    warn('DEV PERSONA', `GET /api/auth/dev-session returned ${status}`, 'Inspect the backend logs.');
  }
}

// ── database ─────────────────────────────────────────────────────────────────
// Development runs SQLite with synchronize:true, so the Postgres migrations in
// backend/src/database/migrations are exercised by nothing on this machine
// except `npm run db:verify` (throwaway Docker Postgres) and CI. Say so, and
// say whether db:verify can run here. Read-only: doctor opens no database.
{
  const backendEnv = existsSync(join(ROOT, 'backend/.env'))
    ? readFileSync(join(ROOT, 'backend/.env'), 'utf8')
    : '';
  const clientMatch = backendEnv.match(/^\s*DATABASE_CLIENT\s*=\s*([^\s#]+)/m);
  const client = clientMatch ? clientMatch[1].toLowerCase() : '';
  const migrationsDir = join(ROOT, 'backend/src/database/migrations');
  const migrationCount = existsSync(migrationsDir)
    ? readdirSync(migrationsDir).filter((f) => /^\d+-.+\.ts$/.test(f)).length
    : 0;
  if (client === 'sqlite') {
    pass(
      'DATABASE',
      `sqlite (backend/.env) — the dev schema is synchronized from the entities; the ${migrationCount} Postgres migration(s) run only in npm run db:verify and CI`,
    );
  } else if (client === 'postgres') {
    pass('DATABASE', 'postgres (backend/.env) — migrations run at startup (migrationsRun: true)');
  } else {
    warn(
      'DATABASE',
      'backend/.env sets no DATABASE_CLIENT — the resolver picks sqlite in development and postgres otherwise',
      'Set DATABASE_CLIENT=sqlite (dev) or DATABASE_CLIENT=postgres explicitly so migration:run and npm start agree.',
    );
  }
  if (migrationCount === 0) {
    fail('DB:VERIFY', 'backend/src/database/migrations holds no migrations', 'npm run db:migration -- InitialSchema');
  } else {
    try {
      const dockerVersion = execSync('docker info --format {{.ServerVersion}}', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 5000,
      }).trim();
      pass('DB:VERIFY', `Docker ${dockerVersion} available — npm run db:verify can prove the migration chain here`);
    } catch {
      warn(
        'DB:VERIFY',
        'Docker is not running — npm run db:verify cannot run on this machine',
        'Start Docker Desktop before a schema change ships; CI runs db:verify against its own Postgres service either way.',
      );
    }
  }
}

if (frontendUp) {
  const status = await httpStatus(`http://127.0.0.1:${FRONTEND_PORT}/`);
  if (status >= 200 && status < 500) pass('FRONTEND', `responding on :${FRONTEND_PORT}`);
  else
    warn(
      'FRONTEND',
      `:${FRONTEND_PORT} is occupied but did not serve the app (status ${status})`,
      `Vite runs with --strictPort, so it will refuse to start while another process holds :${FRONTEND_PORT}.`,
    );
} else {
  warn('FRONTEND', `not running on :${FRONTEND_PORT}`, 'Start it with: npm run dev:web  (or the full stack: npm run dev)');
}

// ── optional local tooling ───────────────────────────────────────────────────
const playwrightCache =
  process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA || '', 'ms-playwright')
    : join(process.env.HOME || '', '.cache', 'ms-playwright');
if (existsSync(playwrightCache)) pass('PLAYWRIGHT', 'browser binaries installed');
else
  warn(
    'PLAYWRIGHT',
    'browsers not installed — e2e, a11y and visual suites cannot run',
    'npx playwright install',
  );

// ── repository self-consistency ──────────────────────────────────────────────
try {
  execSync('node scripts/check-living-documentation.mjs', { cwd: ROOT, stdio: 'ignore' });
  pass('DOCS', 'living documentation matches the implementation');
} catch {
  fail('DOCS', 'living documentation is out of sync with the source', 'npm run docs:generate');
}

if (existsSync(join(ROOT, 'knip.jsonc')) || existsSync(join(ROOT, 'knip.json'))) {
  pass('REACHABILITY', 'knip is configured (npm run deps:check)');
} else {
  warn('REACHABILITY', 'no knip config found', 'Dead-code analysis is unavailable; see npm run deps:check.');
}

// ── report ───────────────────────────────────────────────────────────────────
const ICON = { PASS: 'PASS', WARN: 'WARN', FAIL: 'FAIL' };
const width = Math.max(...results.map((r) => r.name.length));
console.log('\nCareDroid doctor\n');
for (const r of results) {
  console.log(`  ${ICON[r.status]}  ${r.name.padEnd(width)}  ${r.detail}`);
  if (r.fix && r.status !== 'PASS') console.log(`        ${' '.repeat(width)}  -> ${r.fix}`);
}

const failed = results.filter((r) => r.status === 'FAIL');
const warned = results.filter((r) => r.status === 'WARN');
console.log(
  `\n  ${results.length - failed.length - warned.length} passed, ${warned.length} warning(s), ${failed.length} failure(s)\n`,
);

// Warnings describe an environment that is not running, which is normal before
// `npm run dev`. Only real setup faults should fail the command.
process.exit(failed.length ? 1 : 0);
