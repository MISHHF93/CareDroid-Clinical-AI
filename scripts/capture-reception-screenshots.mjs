import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'qa', 'screenshots', 'reception-audit');
const baseURL = process.env.QA_BASE_URL || 'http://localhost:8000';

function authStorage(role) {
  return {
    caredroid_access_token: 'screenshot-audit-token',
    caredroid_user_profile: JSON.stringify({
      id: 'screenshot-audit-user',
      email: 'audit@caredroid.local',
      name: 'Audit User',
      role,
      fullName: 'Audit User',
      isEmailVerified: true,
      twoFactorEnabled: false,
    }),
  };
}

async function capture(page, name) {
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  for (const role of ['admin', 'registration_clerk']) {
    const page = await context.newPage();
    await page.addInitScript((storage) => {
      for (const [key, value] of Object.entries(storage)) {
        localStorage.setItem(key, value);
      }
    }, authStorage(role));

    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: {} }),
      });
    });

    await page.goto(`${baseURL}/emergency/reception`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await capture(page, `${role}-reception`);
    await page.close();
  }

  await browser.close();
  console.log(`Screenshots saved to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
