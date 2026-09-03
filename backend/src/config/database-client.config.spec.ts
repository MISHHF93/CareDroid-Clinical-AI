import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { resolveDatabaseClient } from './database-client.config';

const SRC_ROOT = join(__dirname, '..');

function walkEntityFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'migrations-superseded') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkEntityFiles(full, out);
    else if (/\.entit(y|ies)\.ts$/.test(name)) out.push(full);
  }
  return out;
}

describe('resolveDatabaseClient', () => {
  it('honours an explicit DATABASE_CLIENT', () => {
    expect(resolveDatabaseClient({ DATABASE_CLIENT: 'sqlite', NODE_ENV: 'production' })).toBe(
      'sqlite',
    );
    expect(resolveDatabaseClient({ DATABASE_CLIENT: 'postgres', NODE_ENV: 'development' })).toBe(
      'postgres',
    );
  });

  it('defaults to sqlite only in development without any explicit Postgres configuration', () => {
    expect(resolveDatabaseClient({ NODE_ENV: 'development' })).toBe('sqlite');
    expect(resolveDatabaseClient({ NODE_ENV: 'development', DATABASE_URL: 'postgresql://x' })).toBe(
      'postgres',
    );
    expect(resolveDatabaseClient({ NODE_ENV: 'development', DATABASE_HOST: 'db.internal' })).toBe(
      'postgres',
    );
  });

  it('never picks sqlite for a non-development NODE_ENV', () => {
    expect(resolveDatabaseClient({ NODE_ENV: 'production' })).toBe('postgres');
    expect(resolveDatabaseClient({ NODE_ENV: 'test' })).toBe('postgres');
    expect(resolveDatabaseClient({ NODE_ENV: 'staging' })).toBe('postgres');
  });
});

describe('entity column types are portable across the SQLite and Postgres drivers', () => {
  // TypeORM validates every column against the connected driver's supported
  // types when the DataSource initialises. One driver-specific spelling in one
  // entity makes the whole application refuse to boot on the other driver --
  // which is how `type: 'datetime'` kept the backend off Postgres until
  // 2026-09-03. Portable spellings: `type: Date` (datetime/timestamp),
  // BINARY_COLUMN_TYPE (blob/bytea), 'double precision', 'simple-json'.
  const DRIVER_SPECIFIC =
    /type:\s*'(datetime|timestamp|timestamptz|blob|bytea|double|jsonb|serial|bigserial)'/;

  const files = walkEntityFiles(SRC_ROOT);

  it('scans the entity files the DataSource glob loads', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(files.map((file) => [relative(SRC_ROOT, file), file]))(
    '%s declares no driver-specific column type',
    (_label, file) => {
      const offending = readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .map((line, index) => ({ line: line.trim(), number: index + 1 }))
        .filter(({ line }) => DRIVER_SPECIFIC.test(line));
      expect(offending).toEqual([]);
    },
  );
});
