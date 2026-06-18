import { chromium } from '@playwright/test';

const baseURL = 'http://localhost:8000';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}\n${error.stack}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });

  await page.addInitScript(() => {
    localStorage.setItem('caredroid_access_token', 'debug-token');
    localStorage.setItem(
      'caredroid_user_profile',
      JSON.stringify({
        id: 'debug-user',
        email: 'debug@caredroid.local',
        name: 'Debug',
        role: 'registration_clerk',
        fullName: 'Debug Clerk',
      }),
    );
  });

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/emergency/reception/snapshot')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          emsArrivals: [],
          patients: [],
          metrics: {},
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto(`${baseURL}/emergency/reception`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const bodyText = await page.locator('main, .app-shell, body').first().innerText().catch(() => '');
  console.log('BODY SNIPPET:', bodyText.slice(0, 500));
  console.log('ERRORS:', errors.join('\n---\n') || '(none)');
  await browser.close();
}

main();
