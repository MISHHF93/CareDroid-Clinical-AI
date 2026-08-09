import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const authPath = path.join(process.cwd(), 'e2e', '.auth', 'qa-user.json');
const outPath = path.join(process.cwd(), 'agent-tools', 'copilot-debug.png');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: authPath,
});
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(err.message));

await page.route('**/api/**', async (route) => {
  if (route.request().url().includes('/health')) {
    await route.fulfill({ status: 200, body: '{}' });
    return;
  }
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: null }),
  });
});

await page.goto('http://localhost:3000/emergency/whiteboard', {
  waitUntil: 'networkidle',
  timeout: 60000,
});
await page.waitForTimeout(3000);

const launchVisible = await page.locator('.ed-copilot-launch').count();
const panelBeforeClick = await page.locator('.ed-copilot-panel').count();
const shellBeforeClick = await page.locator('.ed-copilot-shell').count();
const loadingBeforeClick = await page.locator('.ed-copilot-panel--loading').count();

if (!panelBeforeClick && launchVisible) {
  await page.locator('.ed-copilot-launch').first().click();
  await page.waitForTimeout(3000);
}

const panelAfter = await page.locator('.ed-copilot-panel').count();
const shellAfter = await page.locator('.ed-copilot-shell').count();
const errorBoundary = await page.getByText('CopilotPanel encountered an error').count();

fs.mkdirSync(path.dirname(outPath), { recursive: true });
await page.screenshot({ path: outPath, fullPage: false });

console.log(
  JSON.stringify(
    {
      screenshot: outPath,
      launchVisible,
      panelBeforeClick: panelBeforeClick,
      shellBeforeClick,
      loadingBeforeClick,
      panelAfterClick: panelAfter,
      shellAfterClick: shellAfter,
      autoOpened: panelBeforeClick > 0,
      errorBoundary,
      consoleErrors: consoleErrors.slice(0, 10),
      title: await page.title(),
    },
    null,
    2,
  ),
);

await browser.close();