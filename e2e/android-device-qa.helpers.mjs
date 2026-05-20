/**
 * Android device QA helpers — network stubs, touch metrics, sidebar/catalog checks.
 */

import {
  dismissOverlays,
  installQaNetworkStubs as baseInstallQaNetworkStubs,
  measurePageOverflow,
  seedQaAuth,
  waitForAppReady,
} from './responsive-qa.helpers.mjs';

export {
  dismissOverlays,
  measurePageOverflow,
  seedQaAuth,
  waitForAppReady,
};

export { ANDROID_QA_TOUCH_TARGET_MIN_PX } from '../src/data/androidDeviceQaMatrix.js';

/**
 * @param {import('@playwright/test').Page} page
 */
export async function installAndroidQaNetworkStubs(page) {
  await baseInstallQaNetworkStubs(page);

  await page.route('**/api/tools**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tools: [
          { id: 'sofa-calculator', name: 'SOFA Score', available: true },
          { id: 'drug-interactions', name: 'Drug Interactions', available: true },
        ],
        count: 2,
        tier: 'professional',
      }),
    });
  });

  await page.route('**/api/chat/message**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        text: 'QA stub response.',
        intentClassification: { toolId: null, confidence: 0 },
      }),
    });
  });

  await page.route('**/api/config/system**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ rag: { enabled: true }, session: { idleTimeoutMs: 1800000 } }),
    });
  });

  await page.route('**/api/ai/remaining-queries**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ remaining: 100, limit: 100 }),
    });
  });

  await page.route('**/api/subscriptions/current**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ plan: 'professional', status: 'active' }),
    });
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function assertSidebarDrawerCycle(page) {
  const menu = page.getByRole('button', { name: /open navigation menu/i });
  await menu.waitFor({ state: 'visible', timeout: 15_000 });
  await menu.click();

  const sidebar = page.locator('#app-sidebar-nav, .sidebar');
  await page.waitForFunction(
    () => document.querySelector('.sidebar')?.classList.contains('sidebar--open'),
    undefined,
    { timeout: 10_000 }
  );

  const backdrop = page.locator('.app-shell-nav-backdrop');
  await backdrop.click({ force: true });

  await page.waitForFunction(
    () => !document.querySelector('.sidebar')?.classList.contains('sidebar--open'),
    undefined,
    { timeout: 10_000 }
  );
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function assertCatalogInteractions(page) {
  const search = page.locator('.catalog-search');
  await search.waitFor({ state: 'visible', timeout: 30_000 });
  await search.fill('wells');
  await page.waitForTimeout(200);

  const chip = page.locator('.catalog-category-chip').first();
  await chip.waitFor({ state: 'visible' });
  await chip.click();

  const launch = page.getByRole('button', { name: /launch|open|start guided/i }).first();
  await launch.waitFor({ state: 'visible', timeout: 15_000 });
  const box = await launch.boundingBox();
  if (!box || box.width < 40 || box.height < 40) {
    throw new Error(`Catalog launch control too small: ${JSON.stringify(box)}`);
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function assertCalculatorResetVisible(page) {
  const reset = page.locator('.calc-reset-btn').first();
  await reset.waitFor({ state: 'visible', timeout: 60_000 });
  await reset.scrollIntoViewIfNeeded();
  const box = await reset.boundingBox();
  if (!box || box.height < 40) {
    throw new Error('Calculator reset button not sufficiently visible');
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} minPx
 */
export async function assertTouchTargetsForSelectors(page, selectors, minPx = 44) {
  const metrics = await page.evaluate(
    ({ min, selectors: sels }) => {
      /** @type {{ selector: string, w: number, h: number }[]} */
      const small = [];
      for (const sel of sels) {
        const el = document.querySelector(sel);
        if (!el || !(el instanceof HTMLElement)) continue;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.width < min || r.height < min) {
          small.push({ selector: sel, w: Math.round(r.width), h: Math.round(r.height) });
        }
      }
      return { pass: small.length === 0, small };
    },
    { min: minPx, selectors }
  );

  if (!metrics.pass) {
    throw new Error(`Touch targets below ${minPx}px: ${JSON.stringify(metrics.small)}`);
  }
}

export async function assertPrimaryTouchTargets(page, minPx = 44) {
  await assertTouchTargetsForSelectors(
    page,
    ['.app-shell-menu-btn', '.catalog-search', '.catalog-category-chip'],
    minPx
  );
}

export async function assertCalculatorTouchTargets(page, minPx = 44) {
  await assertTouchTargetsForSelectors(
    page,
    ['.app-shell-menu-btn', '.calc-reset-btn'],
    minPx
  );
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function trackBackendRequests(page) {
  /** @type {string[]} */
  const urls = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('/api/')) urls.push(u);
  });
  return urls;
}
