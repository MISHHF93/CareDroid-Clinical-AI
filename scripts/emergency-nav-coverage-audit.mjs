/**
 * Emergency navigation coverage audit.
 * Run: node scripts/emergency-nav-coverage-audit.mjs
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vitest', 'run', 'src/config/emergencyNavCoverageAudit.test.js'],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
);

process.exit(result.status ?? 1);
