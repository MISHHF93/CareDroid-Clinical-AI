import { defineConfig, devices } from '@playwright/test';

const port = process.env.VITE_DEV_PORT || process.env.FRONTEND_PORT || '5190';
const baseURL = (process.env.QA_BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '');

export default defineConfig({
  testDir: './e2e',
  testMatch: 'canonical-route-verification.spec.mjs',
  globalSetup: './e2e/global-setup.mjs',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.QA_RETRIES != null ? Number(process.env.QA_RETRIES) : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'qa/playwright-canonical-routes-report.json' }],
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
  projects: [{ name: 'chromium-canonical-routes', use: { ...devices['Desktop Chrome'] } }],
});
