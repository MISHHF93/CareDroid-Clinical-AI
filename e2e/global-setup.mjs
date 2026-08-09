import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QA_AUTH_STORAGE } from './responsive-qa.helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const authFile = join(__dirname, '.auth', 'qa-user.json');
const baseURL = process.env.QA_BASE_URL || 'http://localhost:3000';

/** Writes Playwright storage state with QA auth (no server required). */
export default async function globalSetup() {
  mkdirSync(dirname(authFile), { recursive: true });

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: baseURL.replace(/\/$/, ''),
        localStorage: Object.entries(QA_AUTH_STORAGE).map(([name, value]) => ({
          name,
          value,
        })),
      },
    ],
  };

  writeFileSync(authFile, `${JSON.stringify(storageState, null, 2)}\n`);
}
