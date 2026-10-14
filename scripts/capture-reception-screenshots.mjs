import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'qa', 'screenshots', 'reception-audit');
const baseURL = process.env.QA_BASE_URL || 'http://localhost:3000';

function authStorage(role) {
  return {
    caredroid_access_token: 'responsive-qa-token',
    caredroid_user_profile: JSON.stringify({
      id: 'screenshot-audit-user',
      email: 'audit@caredroid.local',
      name: 'Audit User',
      role,
      fullName: 'Audit User',
      isEmailVerified: true,
      twoFactorEnabled: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      authMode: 'explicit-dev-bypass',
      isDevAuthBypass: true,
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

  const routes = [
    { path: '/emergency/reception', name: 'reception' },
    { path: '/emergency/intake', name: 'intake' },
    { path: '/emergency/self-arrival', name: 'self-arrival' },
  ];

  for (const role of ['registration_clerk', 'admin']) {
    for (const route of routes) {
      const page = await context.newPage();
      await page.addInitScript((storage) => {
        for (const [key, value] of Object.entries(storage)) {
          localStorage.setItem(key, value);
        }
      }, authStorage(role));

      await page.route('**/api/users/profile**', async (r) => {
        await r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'screenshot-audit-user',
            email: 'audit@caredroid.local',
            name: 'Audit User',
            role,
            fullName: 'Audit User',
            isEmailVerified: true,
            twoFactorEnabled: false,
            authMode: 'explicit-dev-bypass',
            isDevAuthBypass: true,
          }),
        });
      });

      await page.route('**/api/tenant/context**', async (r) => {
        await r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            organizationId: 'qa-organization',
            organizationName: 'Responsive QA Hospital',
            workspaceId: 'operations',
            workspaceName: 'Operations Workspace',
            userId: 'screenshot-audit-user',
            role,
            subscriptionPlan: 'enterprise',
          }),
        });
      });

      await page.route('**/api/**', async (r) => {
        if (!r.isHandled?.()) {
          await r.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, data: {} }),
          });
        }
      });

      await page.goto(`${baseURL}${route.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await capture(page, `${role}-${route.name}`);
      await page.close();
    }
  }

  await browser.close();
  console.log(`Screenshots saved to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
