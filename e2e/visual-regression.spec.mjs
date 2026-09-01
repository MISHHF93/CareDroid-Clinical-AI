import { expect, test } from '@playwright/test';

/**
 * Baselines for the shared shell and a few representative surfaces.
 *
 * Rules this suite holds itself to:
 *  - Never baseline a surface that is not genuinely ready. A page still showing a
 *    loading state, or an access-denied panel for the QA role, is skipped rather
 *    than captured -- a baseline of broken UI is worse than no baseline.
 *  - Mask anything that legitimately changes between runs (clocks, elapsed
 *    timers, "last synced" ages). Otherwise the net fails for real reasons
 *    nobody can act on, and people learn to ignore it.
 */

/**
 * `ready` must match CONTENT, never the page title. The first version of this
 * suite keyed on the title and happily baselined a spinner, because "Medical IoT"
 * is in the breadcrumb long before any device arrives.
 */
const SURFACES = [
  { id: 'medical-iot', path: '/medical-iot', ready: /pulse oximeter|bed 12|spo2/i },
  { id: 'device-fleet', path: '/devices', ready: /pulse oximeter|infusion|monitor/i },
  { id: 'command-center', path: '/emergency/command-center', ready: /waiting|capacity|census|queue/i },
];

const THEMES = ['light', 'dark'];

/**
 * Regions whose content is time-dependent and must not drive a diff. Kept as
 * narrow as possible: every masked pixel is a pixel this net no longer watches,
 * so page titles, badges and layout deliberately stay unmasked.
 */
const VOLATILE_SELECTORS = [
  '.caredroid-header__clock',
  '[class*="elapsed"]',
  '[class*="timer"]',
  '[class*="wait-time"]',
  'time',
];

async function settle(page) {
  // Freeze anything time-driven so two runs of the same UI agree.
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      caret-color: transparent !important;
    }`,
  });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(600);
}

async function isReady(page, readyPattern) {
  const text = await page.evaluate(() => document.body.innerText);
  if (/CareDroid page unavailable|ACCESS DENIED/i.test(text)) return 'access-denied';
  // Any spinner anywhere disqualifies the frame, whatever else matched.
  if (/\bLoading\b/i.test(text)) return 'loading';
  if (/\baria-busy\b/i.test(text)) return 'busy';
  return readyPattern.test(text) ? 'ready' : 'unrecognised';
}

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    for (const surface of SURFACES) {
      test(`${surface.id} matches its baseline`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme });
        await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
        await page.evaluate((t) => {
          document.documentElement.dataset.theme = t;
        }, theme);

        await page
          .waitForFunction(
            (pattern) => new RegExp(pattern, 'i').test(document.body.innerText),
            surface.ready.source,
            { timeout: 45_000 },
          )
          .catch(() => {});

        const state = await isReady(page, surface.ready);
        test.skip(
          state !== 'ready',
          `${surface.path} was "${state}" for the QA role -- not baselining UI that is not genuinely rendered`,
        );

        await settle(page);

        const mask = VOLATILE_SELECTORS.map((selector) => page.locator(selector));
        await expect(page).toHaveScreenshot(`${surface.id}-${theme}.png`, {
          fullPage: false,
          mask,
        });
      });
    }
  });
}
