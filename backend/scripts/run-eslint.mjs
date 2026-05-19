#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.ESLINT_USE_FLAT_CONFIG = 'false';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const result = spawnSync(
  'npx',
  ['eslint', '{src,test}/**/*.ts', '--fix', '--config', '.eslintrc.js'],
  { stdio: 'inherit', shell: true, cwd: backendRoot }
);

process.exit(result.status ?? 1);
