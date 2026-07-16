/**
 * Architect Mode Stage H (early) — production schema must never use TypeORM synchronize.
 */
import { buildPostgresOptions } from './database-url.config';

describe('TypeORM synchronize guard', () => {
  it('defaults synchronize to false for Postgres options', () => {
    const options = buildPostgresOptions({
      entities: [],
      migrations: [],
    });
    expect(options.synchronize).toBe(false);
  });

  it('honors explicit synchronize false even if caller is careless', () => {
    const options = buildPostgresOptions({
      entities: [],
      synchronize: false,
    });
    expect(options.synchronize).toBe(false);
  });

  it('never enables synchronize for production-like builds via data-source contract', async () => {
    // data-source.ts hardcodes synchronize: false for both sqlite and postgres branches.
    // Read the module source contract through re-export of AppDataSource options if available.
    const { AppDataSource } = await import('../data-source');
    const opts = AppDataSource.options as { synchronize?: boolean };
    expect(opts.synchronize).toBe(false);
  });
});
