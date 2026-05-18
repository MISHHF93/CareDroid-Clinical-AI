import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.QA_BASE_URL || 'http://localhost:8000';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'responsive-qa.spec.mjs',
  globalSetup: './e2e/global-setup.mjs',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 1,
  workers: 2,
  reporter: [
    ['list'],
    ['json', { outputFile: 'qa/playwright-responsive-report.json' }],
  ],
  use: {
    baseURL,
    storageState: 'e2e/.auth/qa-user.json',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    {
      name: 'msedge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
});
