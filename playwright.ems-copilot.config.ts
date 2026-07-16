import { defineConfig, devices } from '@playwright/test';

// CareDroid Vite default is 5190 (dev-stack.mjs). Older a11y configs used 8000;
// keep an override path via QA_BASE_URL / VITE_DEV_PORT.
const port = process.env.VITE_DEV_PORT || process.env.FRONTEND_PORT || '5190';
const baseURL = (process.env.QA_BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '');

/**
 * EMS handoff + Copilot e2e (Monday defect D3).
 * Reuses the system-Edge / QA_CHROMIUM_EXECUTABLE escape hatch proven in a11y/perf cycles.
 *
 * Uses `vite` (frontend-only) rather than full `npm run dev` so the suite is
 * hermetic: API calls are network-stubbed in the spec.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'ems-copilot-handoff.spec.mjs',
  globalSetup: './e2e/global-setup.mjs',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.QA_RETRIES != null ? Number(process.env.QA_RETRIES) : 1,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.QA_JSON_REPORT || 'qa/playwright-ems-copilot-report.json' }],
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
    // Prefer an isolated server so a leftover Vite instance cannot contaminate results
    // (lesson from Cycle 60/61 performance measurement). Override with QA_REUSE_SERVER=true.
    reuseExistingServer: process.env.QA_REUSE_SERVER === 'true',
    timeout: 180_000,
  },
  projects: [{ name: 'chromium-ems-copilot', use: { ...devices['Desktop Chrome'] } }],
});
