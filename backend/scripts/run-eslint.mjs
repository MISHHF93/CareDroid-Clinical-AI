#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const shouldFix = process.argv.includes('--fix');

const result = spawnSync('npx', ['eslint', '{src,test}/**/*.ts', ...(shouldFix ? ['--fix'] : [])], {
  stdio: 'inherit',
  shell: true,
  cwd: backendRoot,
});

process.exit(result.status ?? 1);
