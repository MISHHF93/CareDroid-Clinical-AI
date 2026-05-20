/**
 * Android device QA — realistic viewports, routes, catalog, sidebar, touch, landscape.
 */

import { test, expect } from '@playwright/test';
import {
  ANDROID_QA_DEVICES,
  ANDROID_QA_ROUTE_PAGES,
  ANDROID_QA_CALCULATOR_PATHS,
  ANDROID_QA_INTERACTION_DEVICE_IDS,
  viewportForDevice,
} from '../src/data/androidDeviceQaMatrix.js';
import {
  seedQaAuth,
  installAndroidQaNetworkStubs,
  dismissOverlays,
  measurePageOverflow,
  waitForAppReady,
  assertSidebarDrawerCycle,
  assertCatalogInteractions,
  assertCalculatorResetVisible,
  assertPrimaryTouchTargets,
} from './android-device-qa.helpers.mjs';

test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  await seedQaAuth(page);
  await installAndroidQaNetworkStubs(page);
});

test.beforeAll(async ({ request }) => {
  const warmPaths = [
    '/dashboard',
    '/tools/catalog',
    '/tools/calculators',
    '/tools/calculators/has-bled',
    '/tools/calculators/qsofa',
    '/tools/calculator/sofa',
  ];
  for (const path of warmPaths) {
    await request.get(path, { timeout: 120_000 }).catch(() => {});
  }
});

for (const device of ANDROID_QA_DEVICES) {
  for (const orientation of ['portrait', 'landscape']) {
    for (const pageDef of ANDROID_QA_ROUTE_PAGES) {
      test(`[routes] ${device.id} ${orientation} — ${pageDef.id}`, async ({ page }) => {
        const vp = viewportForDevice(device, orientation);
        await page.setViewportSize(vp);
        await page.goto(pageDef.path, { waitUntil: 'commit', timeout: 90_000 });
        await waitForAppReady(page);
        await page.waitForTimeout(150);
        await dismissOverlays(page);

        expect(page.url()).toContain(pageDef.path.split('?')[0]);

        const overflow = await measurePageOverflow(page);
        if (!overflow.pass) {
          const detail = overflow.offenders
            .map((o) => `${o.selector} (+${o.overflowPx}px)`)
            .join('; ');
          expect(overflow.pass, `horizontal overflow: ${detail}`).toBe(true);
        }
      });
    }
  }
}

for (const deviceId of ANDROID_QA_INTERACTION_DEVICE_IDS) {
  const device = ANDROID_QA_DEVICES.find((d) => d.id === deviceId);
  if (!device) continue;

  test(`[sidebar] ${device.id} portrait drawer cycle`, async ({ page }) => {
    await page.setViewportSize(device.portrait);
    await page.goto('/dashboard', { waitUntil: 'commit' });
    await waitForAppReady(page);
    await dismissOverlays(page);
    await assertSidebarDrawerCycle(page);
  });

  test(`[catalog] ${device.id} portrait search and launch`, async ({ page }) => {
    await page.setViewportSize(device.portrait);
    await page.goto('/tools/catalog', { waitUntil: 'commit' });
    await waitForAppReady(page);
    await dismissOverlays(page);
    await assertCatalogInteractions(page);
  });

  test(`[calculators] ${device.id} portrait HAS-BLED reset`, async ({ page }) => {
    await page.setViewportSize(device.portrait);
    await page.goto('/tools/calculators/has-bled', { waitUntil: 'commit' });
    await waitForAppReady(page);
    await dismissOverlays(page);
    await assertCalculatorResetVisible(page);
  });

  test(`[backend] ${device.id} catalog tools API`, async ({ page }) => {
    const apiHits = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/tools') && req.method() === 'GET') {
        apiHits.push(req.url());
      }
    });
    await page.setViewportSize(device.portrait);
    await page.goto('/tools/catalog', { waitUntil: 'commit' });
    await waitForAppReady(page);
    await page.waitForTimeout(500);
    expect(apiHits.length, 'expected GET /api/tools from catalog').toBeGreaterThan(0);
  });

  test(`[touch] ${device.id} portrait primary targets`, async ({ page }) => {
    await page.setViewportSize(device.portrait);
    await page.goto('/tools/catalog', { waitUntil: 'commit' });
    await waitForAppReady(page);
    await dismissOverlays(page);
    await assertPrimaryTouchTargets(page);
  });

  test(`[landscape] ${device.id} HAS-BLED layout`, async ({ page }) => {
    await page.setViewportSize(device.landscape);
    await page.goto('/tools/calculators/has-bled', { waitUntil: 'commit' });
    await waitForAppReady(page);
    await dismissOverlays(page);
    const overflow = await measurePageOverflow(page);
    expect(overflow.pass).toBe(true);
    await assertCalculatorResetVisible(page);
  });
}

for (const path of ANDROID_QA_CALCULATOR_PATHS) {
  test(`[calculators] pixel-7 portrait ${path}`, async ({ page }) => {
    const device = ANDROID_QA_DEVICES.find((d) => d.id === 'pixel-7');
    await page.setViewportSize(device.portrait);
    await page.goto(path, { waitUntil: 'commit' });
    await waitForAppReady(page);
    await assertCalculatorResetVisible(page);
    const overflow = await measurePageOverflow(page);
    expect(overflow.pass).toBe(true);
  });
}
