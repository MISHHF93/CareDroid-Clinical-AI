import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  VITEST_MAX_WORKERS: process.env.VITEST_MAX_WORKERS || '4',
};

const result = spawnSync('npx', ['vitest', 'run', '--maxWorkers', env.VITEST_MAX_WORKERS], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env,
});

process.exit(result.status ?? 1);
