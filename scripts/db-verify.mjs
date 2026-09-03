#!/usr/bin/env node
/**
 * npm run db:verify            prove the migration chain on a real Postgres
 * npm run db:migration -- Name generate a migration for entity changes, then re-verify
 *
 * What it proves, in order:
 *   1. APPLY  — every file in backend/src/database/migrations runs from an
 *               empty database without error.
 *   2. MATCH  — the schema those migrations produce is exactly the schema the
 *               entities describe (TypeORM `migration:generate --check`).
 *
 * Why it exists: development runs SQLite with `synchronize: true` and the e2e
 * suite forces SQLite in memory, so nothing else ever executes the migrations.
 * The first place the chain would run was a production Postgres. Found
 * 2026-09-03: it failed on the very first CREATE TABLE (SQLite column types),
 * and once that was fixed the schema it produced differed from the entities
 * by 1,504 statements.
 *
 * Where the database comes from:
 *   - locally: a throwaway `postgres:15-alpine` container (Docker), removed
 *     afterwards. This script never connects to a database you own.
 *   - under CI=true with DATABASE_URL or DATABASE_HOST set: the job's Postgres
 *     service — the same one .github/workflows/validate.yml provisions.
 *
 * Exit codes: 0 verified · 1 a step failed · 2 could not verify here (no
 * Docker and no CI database).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = path.join(ROOT, 'backend');
const MIGRATIONS_DIR = 'src/database/migrations';
const TYPEORM_CLI = path.join(BACKEND, 'node_modules', 'typeorm', 'cli-ts-node-commonjs.js');
const IMAGE = 'postgres:15-alpine';
const DB_USER = 'caredroid';
const DB_PASSWORD = 'caredroid';
const DB_NAME = 'caredroid_verify';
const READY_TIMEOUT_MS = 60_000;

const args = process.argv.slice(2);
const generateIndex = args.indexOf('--generate');
const generateName = generateIndex === -1 ? null : args[generateIndex + 1];
if (generateIndex !== -1 && (!generateName || !/^[A-Z][A-Za-z0-9]*$/.test(generateName))) {
  console.error(
    'db:migration needs a PascalCase name, e.g. npm run db:migration -- AddPatientsRoomColumn',
  );
  process.exit(1);
}

const results = [];
function report(status, name, detail, fix) {
  results.push({ status, name });
  const line = `${status.padEnd(4)} ${name.padEnd(6)} ${detail}`;
  console.log(line);
  if (fix) console.log(`     fix: ${fix}`);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function docker(dockerArgs) {
  return spawnSync('docker', dockerArgs, { encoding: 'utf8' });
}

/** Run the TypeORM CLI against backend/src/data-source.ts with the verify target injected. */
function typeorm(cliArgs, url) {
  const env = {
    ...process.env,
    DATABASE_CLIENT: 'postgres',
    DATABASE_URL: url,
    NODE_ENV: process.env.NODE_ENV || 'test',
  };
  const useDirect = existsSync(TYPEORM_CLI);
  const result = useDirect
    ? spawnSync(process.execPath, [TYPEORM_CLI, '-d', 'src/data-source.ts', ...cliArgs], {
        cwd: BACKEND,
        env,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      })
    : spawnSync('npx', ['typeorm-ts-node-commonjs', '-d', 'src/data-source.ts', ...cliArgs], {
        cwd: BACKEND,
        env,
        encoding: 'utf8',
        shell: true,
        maxBuffer: 64 * 1024 * 1024,
      });
  const text = `${result.stdout || ''}\n${result.stderr || ''}`;
  // TypeORM echoes every statement as `query: ...`; keep only what a human needs.
  const lines = text.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith('query: '));
  return { status: result.status ?? 1, lines, text };
}

function migrationFiles() {
  const dir = path.join(BACKEND, MIGRATIONS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => /^\d+-.+\.(ts|js)$/.test(file))
    .sort();
}

function resolveCiUrl() {
  if (!process.env.CI) return null;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!process.env.DATABASE_HOST) return null;
  const user = encodeURIComponent(process.env.DATABASE_USER || 'postgres');
  const password = encodeURIComponent(process.env.DATABASE_PASSWORD || 'postgres');
  const port = process.env.DATABASE_PORT || '5432';
  const name = process.env.DATABASE_NAME || 'caredroid';
  return `postgresql://${user}:${password}@${process.env.DATABASE_HOST}:${port}/${name}`;
}

async function startContainer() {
  const info = docker(['info', '--format', '{{.ServerVersion}}']);
  if (info.status !== 0) {
    return { error: 'Docker is not running here' };
  }
  const name = `caredroid-dbverify-${process.pid}`;
  const run = docker([
    'run',
    '--rm',
    '-d',
    '--name',
    name,
    '-e',
    `POSTGRES_USER=${DB_USER}`,
    '-e',
    `POSTGRES_PASSWORD=${DB_PASSWORD}`,
    '-e',
    `POSTGRES_DB=${DB_NAME}`,
    // Let Docker pick a free loopback port; `docker port` reports it below.
    '-p',
    '127.0.0.1::5432',
    IMAGE,
  ]);
  const published = run.status === 0 ? docker(['port', name, '5432/tcp']) : null;
  const port = published
    ? Number((published.stdout || '').trim().split('\n')[0].split(':').pop())
    : NaN;
  if (published && (!Number.isInteger(port) || port <= 0)) {
    docker(['rm', '-f', name]);
    return {
      error: `could not read the published port: ${(published.stderr || published.stdout || '').trim()}`,
    };
  }
  if (run.status !== 0) {
    return { error: `docker run failed: ${(run.stderr || '').trim().split('\n').pop()}` };
  }
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const ready = docker(['exec', name, 'pg_isready', '-U', DB_USER, '-d', DB_NAME]);
    if (ready.status === 0) {
      return {
        name,
        url: `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${port}/${DB_NAME}`,
        stop: () => docker(['rm', '-f', name]),
      };
    }
    sleep(500);
  }
  docker(['rm', '-f', name]);
  return { error: `Postgres did not become ready within ${READY_TIMEOUT_MS / 1000}s` };
}

function printTail(lines, max = 25) {
  for (const line of lines.slice(-max)) console.log(`     | ${line}`);
}

function driftStatements(text) {
  // The generated migration prints as TypeScript; pull the SQL out of `queryRunner.query(...)`.
  const statements = [];
  const pattern = /queryRunner\.query\(\s*`([\s\S]*?)`\s*\)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    statements.push(match[1].replace(/\s+/g, ' ').trim());
  }
  return statements;
}

async function main() {
  console.log('db:verify — migration chain on a real Postgres\n');

  const files = migrationFiles();
  if (files.length === 0) {
    report('FAIL', 'CHAIN', `no migrations found in backend/${MIGRATIONS_DIR}`);
    return 1;
  }
  console.log(`     ${files.length} migration file(s) in backend/${MIGRATIONS_DIR}`);

  let url = resolveCiUrl();
  let stop = () => {};
  if (url) {
    console.log('     target: CI-provided Postgres service');
  } else {
    const container = await startContainer();
    if (container.error) {
      report(
        'SKIP',
        'TARGET',
        container.error,
        'Start Docker Desktop (the container is throwaway and removed afterwards). CI runs this against its own Postgres service.',
      );
      return 2;
    }
    url = container.url;
    stop = container.stop;
    console.log(`     target: throwaway ${IMAGE} container ${container.name}`);
  }

  const onInterrupt = () => {
    stop();
    process.exit(130);
  };
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onInterrupt);

  try {
    console.log('');
    const run = typeorm(['migration:run'], url);
    const executed = run.lines.filter((line) =>
      line.includes('has been executed successfully'),
    ).length;
    if (run.status !== 0) {
      report('FAIL', 'APPLY', `chain stopped after ${executed} of ${files.length} migration(s)`);
      printTail(run.lines.filter((line) => !line.includes('has been executed successfully')));
      return 1;
    }
    report('PASS', 'APPLY', `${executed} migration(s) applied from an empty database`);

    if (generateName) {
      const target = `${MIGRATIONS_DIR}/${generateName}`;
      const gen = typeorm(['migration:generate', '--pretty', target], url);
      const created = gen.lines.find((line) => /has been generated successfully/.test(line));
      if (gen.status !== 0 || !created) {
        const noChanges = gen.lines.some((line) =>
          /No changes in database schema were found/.test(line),
        );
        report(
          noChanges ? 'PASS' : 'FAIL',
          'GEN',
          noChanges
            ? 'entities already match the chain; nothing to generate'
            : 'migration:generate failed',
        );
        if (!noChanges) {
          printTail(gen.lines);
          return 1;
        }
      } else {
        report('PASS', 'GEN', created.replace(/^Migration /, '').trim());
        // Apply the new file so the MATCH step below checks the chain as committed.
        const rerun = typeorm(['migration:run'], url);
        if (rerun.status !== 0) {
          report('FAIL', 'APPLY', 'the generated migration does not apply');
          printTail(rerun.lines);
          return 1;
        }
      }
    }

    const check = typeorm(
      ['migration:generate', '--check', `${MIGRATIONS_DIR}/DbVerifyDrift`],
      url,
    );
    if (check.status === 0) {
      report('PASS', 'MATCH', 'schema produced by the chain matches the entities');
      return 0;
    }
    const statements = driftStatements(check.text);
    if (statements.length === 0) {
      report('FAIL', 'MATCH', 'migration:generate --check failed');
      printTail(check.lines);
      return 1;
    }
    report(
      'FAIL',
      'MATCH',
      `entities differ from the chain by ${statements.length} statement(s)`,
      'entity changed without a migration → npm run db:migration -- <PascalCaseName>, review the file, commit it',
    );
    for (const statement of statements.slice(0, 20)) console.log(`     | ${statement}`);
    if (statements.length > 20) console.log(`     | … ${statements.length - 20} more`);
    return 1;
  } finally {
    stop();
  }
}

main()
  .then((code) => {
    const failed = results.filter((r) => r.status === 'FAIL').length;
    console.log(`\ndb:verify: ${results.length - failed} passed, ${failed} failed`);
    process.exit(code);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
