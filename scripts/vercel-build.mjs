import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

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

const runNodeScript = (relativeScript, label) => {
  const scriptPath = path.join(ROOT, relativeScript);
  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: 'inherit',
    env: process.env,
    cwd: ROOT,
  });

  if (result.error) {
    console.error(`${label} failed to start:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

runNodeScript('scripts/validate-vercel-env.mjs', 'Vercel environment validation');
runNodeScript('scripts/validate-assets.mjs', 'Asset validation');

const viteResult = spawnSync(
  process.execPath,
  [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'],
  {
    stdio: 'inherit',
    env: process.env,
    cwd: ROOT,
  },
);

if (viteResult.error) {
  console.error('Vite build failed to start:', viteResult.error.message);
  process.exit(1);
}

if (viteResult.status !== 0) {
  process.exit(viteResult.status ?? 1);
}
