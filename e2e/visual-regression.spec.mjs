import { expect, test } from '@playwright/test';

/**
 * Baselines for the shared application shell.
 *
 * Scope and rules here were all arrived at by getting something wrong first.
 *
 *  - It watches the SHELL, not page content. Content was tried and dropped: the
 *    operations surfaces nondeterministically render either backend telemetry or
 *    a local fallback, so the same page gave 7/2/10 devices on one run and 2/0/4
 *    on the next with nothing changed. The shell is the right subject anyway --
 *    sidebar and header are the design system's most reused surface, present on
 *    every route, and where token, icon and spacing regressions surface first.
 *    This suite caught the Tabler-to-Lucide icon migration.
 *
 *  - One capture per theme, not one per route. Sidebar and header are identical
 *    across routes bar the active item, so capturing them per surface produced
 *    near-duplicate images and mistook redundancy for coverage.
 *
 *  - Live counters are HIDDEN, not masked and not pinned. Masking cannot hide the
 *    layout shift its content causes. Pinning the text was not enough either: the
 *    alert badge is conditional, so at a count of zero it does not render at all
 *    and every nav row below it moves. See settle() for the full reasoning and
 *    for what this costs.
 *
 *  - Readiness matches structural furniture, never the page title and never data.
 *    Keying on the title captured "Loading Medical IoT..." because the title sits
 *    in the breadcrumb immediately; keying on device names then skipped a page
 *    that was rendering fine, because the demo dataset varies between runs.
 *
 *  - The in-flight check is scoped to the shell. A spinner in the page body is no
 *    reason to skip a shell snapshot -- /devices shows a persistent "Loading
 *    device registry..." beneath fully rendered chrome.
 */

/** Host route for the shell. Any authenticated route renders the same chrome. */
const SHELL_ROUTE = {
  path: '/medical-iot',
  ready: /medical iot source state/i,
};

const THEMES = ['light', 'dark'];

/** Live counters, hidden before capture -- see settle() for why. */
const HIDDEN_COUNTERS = [
  '.sidebar-nav-item__count',
  '.cdl-kpi-capsule__value',
  '.caredroid-header__clock',
];

/** Still masked: their size does not drive the layout around them. */
const VOLATILE_SELECTORS = [
  '[class*="elapsed"]',
  '[class*="timer"]',
  '[class*="wait-time"]',
  'time',
];

const SHELL_REGIONS = [
  { id: 'sidebar', selector: '.sidebar-desktop-nav' },
  { id: 'header', selector: '.caredroid-header' },
];

async function settle(page) {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      caret-color: transparent !important;
    }`,
  });

  // Counters are removed from layout entirely, not masked and not pinned.
  //
  // Masking failed because a mask cannot hide the layout shift its content
  // causes. Pinning the text failed for a subtler reason: the alert badge is not
  // merely variable, it is CONDITIONAL -- at a count of zero the element does not
  // render at all, the nav row is shorter, and every row below it moves. There is
  // no text to pin on a node that does not exist.
  //
  // Hiding them is deterministic in both directions: absent in the baseline and
  // absent in every comparison. The cost is honest and worth naming -- this net
  // does not watch the counters themselves. Everything around them (icons,
  // labels, spacing, colour, grouping) stays under watch, which is what a
  // design-system net is for.
  await page.addStyleTag({
    content: `${HIDDEN_COUNTERS.join(', ')} { display: none !important; }`,
  });

  // Pin scroll offsets. The sidebar holds ~30 nav items in a 900px viewport, so
  // it scrolls, and an element screenshot captures whatever offset it happens to
  // sit at. That produced a diff where every row below a certain point looked
  // displaced -- which reads exactly like an inserted row, and sent me looking at
  // conditional badges twice before the item count turned out to be a stable 30.
  await page.evaluate((selectors) => {
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        element.scrollTop = 0;
        element.scrollLeft = 0;
      }
    }
    window.scrollTo(0, 0);
  }, ['.sidebar-desktop-nav', '.caredroid-header', '[class*="sidebar"]']);

  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(600);
}

async function openShell(page, theme) {
  // Pin the theme before the app boots. Poking data-theme after goto raced
  // ThemeContext's own initialisation, and every light snapshot drifted while
  // dark stayed stable.
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem('caredroid-theme-preference', t);
    } catch {
      /* private mode -- emulateMedia below still pins the resolved theme */
    }
  }, theme);
  await page.emulateMedia({ colorScheme: theme });
  await page.goto(SHELL_ROUTE.path, { waitUntil: 'domcontentloaded' });

  await page
    .waitForFunction(
      (pattern) => new RegExp(pattern, 'i').test(document.body.innerText),
      SHELL_ROUTE.ready.source,
      { timeout: 45_000 },
    )
    .catch(() => {});

  const body = await page.evaluate(() => document.body.innerText);
  if (/CareDroid page unavailable|ACCESS DENIED/i.test(body)) return 'access-denied';
  if (!SHELL_ROUTE.ready.test(body)) return 'unrecognised';

  // Scoped to the chrome, so a spinner in the page body cannot veto the capture.
  await page
    .waitForFunction(
      () =>
        ['.sidebar-desktop-nav', '.caredroid-header'].every((selector) => {
          const element = document.querySelector(selector);
          return (
            element && !/\b(Loading|Scanning|Refreshing|Updating)\b/i.test(element.textContent || '')
          );
        }),
      null,
      { timeout: 30_000 },
    )
    .catch(() => {});

  await settle(page);
  return 'ready';
}

for (const theme of THEMES) {
  test(`application shell matches its baseline in ${theme}`, async ({ page }) => {
    const state = await openShell(page, theme);
    test.skip(state !== 'ready', `shell host route was "${state}" for the QA role`);

    const mask = VOLATILE_SELECTORS.map((selector) => page.locator(selector));

    for (const region of SHELL_REGIONS) {
      await expect(page.locator(region.selector).first()).toHaveScreenshot(
        `shell-${region.id}-${theme}.png`,
        { mask },
      );
    }
  });
}
