import { spawnSync } from 'node:child_process';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, NODE_ENV: 'production' },
    ...options,
  });

  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('npm', ['run', 'build:frontend']);
run('npm', ['run', 'backend:build']);
run('npm', ['run', 'backend:start']);
