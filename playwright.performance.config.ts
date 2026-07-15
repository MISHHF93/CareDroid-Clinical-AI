import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.QA_BASE_URL || 'http://localhost:8000';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'performance.spec.mjs',
  globalSetup: './e2e/global-setup.mjs',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.QA_RETRIES != null ? Number(process.env.QA_RETRIES) : 0,
  workers: Number(process.env.QA_WORKERS) || 2,
  reporter: [['list']],
  use: {
    baseURL,
    storageState: 'e2e/.auth/qa-user.json',
    trace: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    // Escape hatch for sandboxes where the downloaded Playwright browser is
    // blocked (e.g. by an Application Control policy) but a system browser
    // install is already trusted. No effect unless explicitly set.
    launchOptions: process.env.QA_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.QA_CHROMIUM_EXECUTABLE }
      : {},
  },
  // Performance numbers from a dev server (unbundled ES modules, no
  // minification, HMR client overhead) are not representative of anything
  // real, so this profile always serves the production build.
  webServer: {
    command: 'npm run preview',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
