/* global process */
import { defineConfig, devices } from '@playwright/test';

const rawBaseURL = process.env.QA_BASE_URL?.trim();

if (!rawBaseURL) {
  throw new Error(
    'QA_BASE_URL is required for production smoke tests, for example: QA_BASE_URL=https://app.example.com npm run test:e2e:production'
  );
}

const baseURL = rawBaseURL.replace(/\/+$/, '');
const storageState = process.env.QA_AUTH_STATE?.trim();

export default defineConfig({
  testDir: './e2e',
  testMatch: 'production-smoke.spec.mjs',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.QA_RETRIES != null ? Number(process.env.QA_RETRIES) : 0,
  workers: Number(process.env.QA_WORKERS) || 2,
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.QA_PRODUCTION_JSON || 'qa/playwright-production-smoke-report.json' }],
  ],
  use: {
    baseURL,
    ...(storageState ? { storageState } : {}),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 25_000,
    navigationTimeout: 90_000,
  },
  projects: [
    {
      name: 'production-chromium',
      use: {
        ...devices['Pixel 7'],
        browserName: 'chromium',
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
