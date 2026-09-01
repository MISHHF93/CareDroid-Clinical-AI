import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.QA_BASE_URL || 'http://localhost:3000';

/**
 * Visual-regression baselines.
 *
 * The design system is ~400 hand-rolled CSS files whose own comments describe an
 * "intentional cascade -- last wins", and nothing detected a break caused by
 * reordering an import or changing a token value. This config is the safety net
 * for that, built on the Playwright already in the repo rather than a new
 * screenshot service.
 *
 * Chromium only and a single fixed viewport on purpose: baselines are only useful
 * if they are deterministic, and rendering differences between engines produce
 * noise that trains people to ignore the net.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'visual-regression.spec.mjs',
  globalSetup: './e2e/global-setup.mjs',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  timeout: 120_000,
  expect: {
    // Anti-aliasing and subpixel text rendering shift a few pixels between runs
    // on the same machine, so this is not a hard zero -- but it is deliberately
    // tight. At the 1% this started on, a corner-radius change across every card
    // on the page still passed: 1% of a 1440x900 frame is ~13,000 pixels, far
    // more than any small token change moves. A net that only catches redesigns
    // is not a net.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.0005,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    storageState: 'e2e/.auth/qa-user.json',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
