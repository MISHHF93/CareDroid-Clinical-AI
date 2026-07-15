/**
 * First real performance measurement pass — Navigation/Paint Timing + Core
 * Web Vitals proxies (LCP, CLS, long-task-derived TBT approximation) captured
 * against the production build (see playwright.performance.config.ts) via the
 * real browser, not a synthetic/simulated estimate.
 *
 * Report-only: no hard pass/fail thresholds yet. A single local run on a
 * shared dev machine is not a stable enough sample to gate on, and dev-tier
 * hardware/network conditions here don't represent real user conditions
 * either. This establishes a real, honest baseline to compare future runs
 * against, following the same "measure first, don't invent a threshold"
 * discipline as this project's other first-pass QA suites.
 */

import { test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dismissOverlays,
  installQaNetworkStubs,
  seedQaAuth,
  waitForAppReady,
} from './responsive-qa.helpers.mjs';

test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await seedQaAuth(page);
  await installQaNetworkStubs(page);
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, '..', 'qa', 'performance-results');

/** Same representative page set as the a11y suite, for a directly comparable baseline. */
const PERF_PAGES = [
  { id: 'dashboard', label: 'Command Dashboard', path: '/dashboard' },
  { id: 'assistant', label: 'AI Assistant / Chat', path: '/assistant' },
  { id: 'tools-overview', label: 'Tool Library', path: '/tools' },
  { id: 'calculators-hub', label: 'Calculators Hub', path: '/tools/calculators' },
  { id: 'calculator-bmi', label: 'BMI Calculator (form)', path: '/tools/calculators/bmi' },
  { id: 'clinical-alerts', label: 'Clinical Alerts', path: '/clinical/alerts' },
  { id: 'hospital-map', label: 'Hospital Map', path: '/hospital-map' },
  { id: 'devices', label: 'Device Fleet Management', path: '/devices' },
];

for (const pageDef of PERF_PAGES) {
  test(`performance: ${pageDef.id}`, async ({ page }, testInfo) => {
    const navigationStart = Date.now();
    await page.goto(pageDef.path, { waitUntil: 'commit', timeout: 60_000 });
    await waitForAppReady(page);
    await dismissOverlays(page);
    const wallClockMs = Date.now() - navigationStart;

    const metrics = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const nav = performance.getEntriesByType('navigation')[0];
          const paintEntries = performance.getEntriesByType('paint');
          const fcp = paintEntries.find((e) => e.name === 'first-contentful-paint')?.startTime ?? null;

          const lcpEntries = [];
          const clsEntries = [];
          const longTasks = [];

          try {
            new PerformanceObserver((list) => lcpEntries.push(...list.getEntries())).observe({
              type: 'largest-contentful-paint',
              buffered: true,
            });
          } catch {
            /* not supported in this browser build */
          }
          try {
            new PerformanceObserver((list) => clsEntries.push(...list.getEntries())).observe({
              type: 'layout-shift',
              buffered: true,
            });
          } catch {
            /* not supported */
          }
          try {
            new PerformanceObserver((list) => longTasks.push(...list.getEntries())).observe({
              type: 'longtask',
              buffered: true,
            });
          } catch {
            /* not supported */
          }

          setTimeout(() => {
            const lcp = lcpEntries.length ? lcpEntries[lcpEntries.length - 1].startTime : null;
            const cls = clsEntries.reduce((sum, e) => sum + (e.hadRecentInput ? 0 : e.value), 0);
            const tbtApprox = longTasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0);

            const resourceEntries = performance.getEntriesByType('resource');
            const totalTransferBytes = resourceEntries.reduce(
              (sum, r) => sum + (r.transferSize || 0),
              nav ? nav.transferSize || 0 : 0,
            );

            resolve({
              ttfbMs: nav ? Math.round(nav.responseStart) : null,
              domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
              loadEventMs: nav ? Math.round(nav.loadEventEnd) : null,
              documentTransferSizeBytes: nav ? nav.transferSize : null,
              totalTransferBytes,
              resourceCount: resourceEntries.length,
              fcpMs: fcp != null ? Math.round(fcp) : null,
              lcpMs: lcp != null ? Math.round(lcp) : null,
              cls: Number(cls.toFixed(4)),
              longTaskCount: longTasks.length,
              tbtApproxMs: Math.round(tbtApprox),
            });
          }, 750);
        }),
    );

    const result = {
      pageId: pageDef.id,
      path: pageDef.path,
      wallClockMs,
      ...metrics,
    };

    mkdirSync(RESULTS_DIR, { recursive: true });
    writeFileSync(join(RESULTS_DIR, `${pageDef.id}.json`), JSON.stringify(result, null, 2));

    testInfo.attach('performance-metrics', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    });
  });
}
