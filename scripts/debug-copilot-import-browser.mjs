import { chromium } from 'playwright';
import path from 'node:path';

const authPath = path.join(process.cwd(), 'e2e', '.auth', 'qa-user.json');
const failed = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: authPath,
});
const page = await context.newPage();

page.on('requestfailed', (req) => {
  if (req.url().includes('CopilotPanel') || req.url().includes('copilot')) {
    failed.push({ url: req.url(), error: req.failure()?.errorText });
  }
});

page.on('pageerror', (err) => {
  failed.push({ pageerror: err.message });
});

page.on('console', (msg) => {
  if (msg.type() === 'error') failed.push({ console: msg.text() });
});

await page.goto('http://localhost:8000/emergency/whiteboard', {
  waitUntil: 'networkidle',
  timeout: 60000,
});
await page.waitForTimeout(5000);

const panel = await page.locator('.ed-copilot-panel').count();
const errorText = await page.getByText('CopilotPanel encountered an error').count();
const fetchError = await page.getByText('Failed to fetch dynamically imported module').count();

console.log(
  JSON.stringify(
    {
      panel,
      errorBoundary: errorText,
      fetchErrorVisible: fetchError,
      failed: failed.slice(0, 20),
    },
    null,
    2,
  ),
);

await browser.close();