import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.QA_BASE_URL || 'http://localhost:8000';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'android-device-qa.spec.mjs',
  globalSetup: './e2e/global-setup.mjs',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.QA_RETRIES != null ? Number(process.env.QA_RETRIES) : 1,
  workers: Number(process.env.QA_WORKERS) || 3,
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.QA_ANDROID_JSON || 'qa/playwright-android-report.json' }],
  ],
  use: {
    ...devices['Pixel 7'],
    baseURL,
    storageState: 'e2e/.auth/qa-user.json',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 25_000,
    navigationTimeout: 90_000,
    hasTouch: true,
    isMobile: true,
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium-android', use: { browserName: 'chromium' } }],
});
