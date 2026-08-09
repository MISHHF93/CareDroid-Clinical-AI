import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const authPath = path.join(process.cwd(), 'e2e', '.auth', 'qa-user.json');
const outPath = path.join(process.cwd(), 'agent-tools', 'copilot-layout-after.png');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: authPath,
});
const page = await context.newPage();

await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  if (url.includes('/health')) {
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
await page.waitForTimeout(2500);

const launchButton = page.locator('.ed-copilot-launch').first();
if (await launchButton.count()) {
  await launchButton.click();
  await page.waitForTimeout(1500);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
await page.screenshot({ path: outPath, fullPage: false });

const panel = page.locator('.ed-copilot-panel').first();
const panelBox = await panel.boundingBox().catch(() => null);
const messagesBox = await page.locator('.ed-copilot-panel__messages').first().boundingBox().catch(() => null);
const composerBox = await page.locator('.ed-copilot-panel__composer').first().boundingBox().catch(() => null);
const tabs = await page.locator('.ed-copilot-shell__tab').count();

console.log(
  JSON.stringify(
    {
      screenshot: outPath,
      panelCount: await page.locator('.ed-copilot-panel').count(),
      tabCount: tabs,
      panelBox,
      messagesBox,
      composerBox,
      title: await page.title(),
    },
    null,
    2,
  ),
);

await browser.close();