import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const backendRequire = createRequire(new URL('../backend/package.json', import.meta.url));
const mongoose = backendRequire('mongoose');

const setupMigration = backendRequire('./migrations/009_create_unified_patients.js');
const unifiedMigration = backendRequire('./migrations/010_migrate_to_unified_patients.js');
const rollbackMigration = backendRequire('./migrations/010_rollback_unified_patients.js');

function parseArgs(argv) {
  return {
    rollback: argv.includes('--rollback'),
    skipSetup: argv.includes('--skip-setup'),
    allowProduction:
      argv.includes('--allow-production') ||
      process.env.ALLOW_UNIFIED_MIGRATION_PRODUCTION === 'true',
    backupId:
      argv
        .find((arg) => arg.startsWith('--backup-id='))
        ?.split('=')
        .slice(1)
        .join('=') || process.env.MIGRATION_010_BACKUP_ID,
  };
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (process.env[key]) continue;
    process.env[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '');
  }
}

function loadLocalEnv() {
  loadEnvFile(resolve(process.cwd(), '.env'));
  loadEnvFile(resolve(process.cwd(), 'backend', '.env'));
}

function mongoUri() {
  return process.env.MONGODB_URI || process.env.DATABASE_MONGO_URI || process.env.MONGO_URI;
}

function mongoDbName() {
  return (
    process.env.MONGODB_DB_NAME || process.env.DATABASE_MONGO_DB_NAME || process.env.MONGO_DB_NAME
  );
}

function redactUri(uri) {
  return uri.replace(/\/\/([^:/@]+):([^@]+)@/, '//<redacted>:<redacted>@');
}

function looksProduction(uri) {
  const env = String(process.env.NODE_ENV || process.env.APP_ENV || '').toLowerCase();
  if (env === 'production' || env === 'prod') return true;
  try {
    const parsed = new URL(uri);
    const databaseName = parsed.pathname.replace(/^\//, '').toLowerCase();
    const host = parsed.hostname.toLowerCase();
    return /\b(prod|production)\b/.test(databaseName) || /\b(prod|production)\b/.test(host);
  } catch {
    return /\b(prod|production)\b/i.test(uri);
  }
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  const uri = mongoUri();

  if (!uri) {
    throw new Error(
      'Set MONGODB_URI or DATABASE_MONGO_URI before running the unified patient migration.',
    );
  }
  if (looksProduction(uri) && !args.allowProduction) {
    throw new Error(
      'Refusing to run against a production-looking MongoDB connection. Re-run with --allow-production only after taking an approved production backup.',
    );
  }

  const connectionOptions = {};
  const dbName = mongoDbName();
  if (dbName) connectionOptions.dbName = dbName;

  console.log(`Connecting to MongoDB for unified patient migration: ${redactUri(uri)}`);
  await mongoose.connect(uri, connectionOptions);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Mongoose connected without an available database handle.');
  }

  try {
    if (args.rollback) {
      await rollbackMigration.up(db, { backupId: args.backupId });
      return;
    }

    if (!args.skipSetup) {
      await setupMigration.up(db);
    }
    await unifiedMigration.up(db);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect errors after a failed connection.
  }
  process.exitCode = 1;
});
