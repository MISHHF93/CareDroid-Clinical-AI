import { spawnSync } from 'node:child_process';

/**
 * Canonical hosted-demo defaults for Vercel frontend builds.
 *
 * Dashboard env copied from .env.example often sets VITE_HIDE_DIVISION_MODE=false
 * or VITE_DEMO_MODE=false, which fails validate:vercel-env. Vercel deploys in
 * this repo are demo/staging SPAs — force safe values here instead of relying on
 * shell ${VAR:-default} exports that preserve explicit false values.
 */
const VERCEL_DEMO_DEFAULTS = {
  VITE_ALLOW_SAME_ORIGIN_API: 'false',
  VITE_DEMO_MODE: 'true',
  VITE_ENABLE_DEV_AUTH_BYPASS: 'false',
  VITE_HIDE_DIVISION_MODE: 'true',
};

for (const [key, value] of Object.entries(VERCEL_DEMO_DEFAULTS)) {
  process.env[key] = value;
}

const apiUrl = String(process.env.VITE_API_URL || '').trim();
if (apiUrl && /\/api\/?$/i.test(apiUrl)) {
  process.env.VITE_API_URL = apiUrl.replace(/\/api\/?$/i, '');
}

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run('npm', ['run', 'validate:vercel-env']);
run('npm', ['run', 'build']);