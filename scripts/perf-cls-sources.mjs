/**
 * Capture real `LayoutShift` entry `sources` (which DOM node moved, from
 * where to where) for a single route -- the attribution data
 * `e2e/performance.spec.mjs`'s CLS number doesn't carry, since it only sums
 * `entry.value`. When a page's CLS is unexpectedly high, this answers
 * "which element" instead of leaving it as a bare number to guess at.
 *
 * Usage:
 *   QA_BASE_URL=http://localhost:5195 node scripts/perf-cls-sources.mjs /devices
 *
 * Env: same QA_BASE_URL / QA_CHROMIUM_EXECUTABLE convention as the other perf-*.mjs scripts.
 */
import { chromium } from 'playwright-core';

const executablePath =
  process.env.QA_CHROMIUM_EXECUTABLE ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseURL = process.env.QA_BASE_URL || 'http://localhost:3000';
const routePath = process.argv[2] || '/clinical/alerts';

const QA_AUTH_STORAGE = {
  caredroid_access_token: 'responsive-qa-token',
  // authMode required so demoPersonaModel.ts's hydrateStoredDemoUser() honors
  // role: 'admin' instead of silently discarding it (see the identical fix +
  // comment in e2e/responsive-qa.helpers.mjs, Cycle 214).
  caredroid_user_profile: JSON.stringify({
    id: 'responsive-qa-user',
    email: 'qa@caredroid.local',
    name: 'Responsive QA',
    role: 'admin',
    fullName: 'Responsive QA',
    isEmailVerified: true,
    twoFactorEnabled: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    authMode: 'open-access',
  }),
};

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ baseURL });
  await context.addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
  }, QA_AUTH_STORAGE);

  const page = await context.newPage();
  await page.route('**/api/users/profile**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(JSON.parse(QA_AUTH_STORAGE.caredroid_user_profile)),
    }),
  );
  await page.route('**/api/tenant/context**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        organizationId: 'qa-organization',
        organizationName: 'QA',
        workspaceId: 'operations',
        workspaceName: 'Ops',
        userId: 'responsive-qa-user',
        role: 'admin',
        subscriptionPlan: 'enterprise',
      }),
    }),
  );
  await page.route('**/api/tools**', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tools: [], count: 0 }),
    });
  });
  await page.route('**/api/config/system**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ rag: { enabled: true }, session: { idleTimeoutMs: 1800000 } }),
    }),
  );
  await page.route('**/api/ai/remaining-queries**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ remaining: 100, limit: 100 }),
    }),
  );
  await page.route('**/api/subscriptions/current**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ plan: 'professional', status: 'active' }),
    }),
  );

  await page.addInitScript(() => {
    window.__clsShifts = [];
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__clsShifts.push({
            value: entry.value,
            hadRecentInput: entry.hadRecentInput,
            startTime: entry.startTime,
            sources: (entry.sources || []).map((s) => ({
              node: s.node
                ? `${s.node.nodeName}${s.node.id ? '#' + s.node.id : ''}${s.node.className ? '.' + String(s.node.className).replace(/\s+/g, '.') : ''}`
                : '(no node -- removed before observation)',
              previousRect: s.previousRect
                ? {
                    x: s.previousRect.x,
                    y: s.previousRect.y,
                    w: s.previousRect.width,
                    h: s.previousRect.height,
                  }
                : null,
              currentRect: s.currentRect
                ? {
                    x: s.currentRect.x,
                    y: s.currentRect.y,
                    w: s.currentRect.width,
                    h: s.currentRect.height,
                  }
                : null,
            })),
          });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {
      /* not supported in this browser build */
    }
  });

  await page.goto(routePath, { waitUntil: 'commit', timeout: 60_000 });
  await page.waitForFunction(() => !document.querySelector('.app-init-screen'), undefined, {
    timeout: 30_000,
  });
  await page.waitForTimeout(1200);

  const shifts = await page.evaluate(() => window.__clsShifts || []);
  await browser.close();

  console.log(`\n=== Layout shift entries for ${routePath}: ${shifts.length} ===`);
  for (const s of shifts) {
    console.log(
      `\nvalue=${s.value.toFixed(4)} hadRecentInput=${s.hadRecentInput} startTime=${s.startTime.toFixed(1)}ms`,
    );
    if (!s.sources.length)
      console.log('  (no sources reported -- shift below the per-node attribution threshold)');
    for (const src of s.sources) {
      console.log(`  node=${src.node}`);
      console.log(`    prev=${JSON.stringify(src.previousRect)}`);
      console.log(`    curr=${JSON.stringify(src.currentRect)}`);
    }
  }
  const total = shifts.reduce((sum, s) => sum + (s.hadRecentInput ? 0 : s.value), 0);
  console.log(`\nTotal CLS: ${total.toFixed(4)}`);
})();
