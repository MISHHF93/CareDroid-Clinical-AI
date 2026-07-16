import { defineConfig, devices } from '@playwright/test';

// Hermetic Vite on 5190 (same pattern as EMS-copilot; avoid contaminated :8000 / full dev-stack).
const port = process.env.VITE_DEV_PORT || process.env.FRONTEND_PORT || '5190';
const baseURL = (process.env.QA_BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '');

export default defineConfig({
  testDir: './e2e',
  testMatch: 'a11y.spec.mjs',
  globalSetup: './e2e/global-setup.mjs',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.QA_RETRIES != null ? Number(process.env.QA_RETRIES) : 1,
  workers: Number(process.env.QA_WORKERS) || 2,
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.QA_JSON_REPORT || 'qa/playwright-a11y-report.json' }],
  ],
  use: {
    baseURL,
    storageState: 'e2e/.auth/qa-user.json',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    launchOptions: process.env.QA_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.QA_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: `npx vite --strictPort --port ${port}`,
    url: baseURL,
    reuseExistingServer: process.env.QA_REUSE_SERVER === 'true',
    timeout: 180_000,
  },
  projects: [{ name: 'chromium-a11y', use: { ...devices['Desktop Chrome'] } }],
});
