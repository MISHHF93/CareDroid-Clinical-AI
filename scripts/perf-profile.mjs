/**
 * CPU-profile a single route in a real browser via the Chrome DevTools Protocol.
 *
 * Complements e2e/performance.spec.mjs: the spec measures Web Vitals
 * (LCP/CLS/TBT); this script answers "WHICH code is burning the main thread"
 * by capturing a V8 sampling profile during page load and aggregating
 * self-time per script URL and per function.
 *
 * Usage:
 *   QA_BASE_URL=http://localhost:5195 node scripts/perf-profile.mjs /clinical/alerts
 *
 * Env:
 *   QA_BASE_URL              target server (default http://localhost:5190)
 *   QA_CHROMIUM_EXECUTABLE   browser binary (default: system Edge). Same escape
 *                            hatch as the Playwright configs for sandboxes where
 *                            the downloaded Playwright browser is blocked.
 *
 * Interpreting output: on a production build the URLs are hashed dist assets;
 * if you see raw /src/*.tsx or /node_modules/.vite/deps/* URLs you are
 * profiling a DEV server and the numbers are meaningless -- rebuild and point
 * QA_BASE_URL at `vite preview`. (This exact mistake produced the invalid
 * Cycle 60 baseline; the URL check is the tell.)
 */
import { chromium } from 'playwright-core';

const executablePath =
  process.env.QA_CHROMIUM_EXECUTABLE ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseURL = process.env.QA_BASE_URL || 'http://localhost:5190';
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

function aggregateProfile(profile) {
  const nodesById = new Map(profile.nodes.map((n) => [n.id, n]));
  const selfTimeById = new Map();
  const { samples, timeDeltas } = profile;
  for (let i = 0; i < samples.length; i++) {
    const delta = timeDeltas[i] || 0;
    const id = samples[i];
    selfTimeById.set(id, (selfTimeById.get(id) || 0) + delta);
  }
  const rows = [];
  for (const [id, selfMicros] of selfTimeById.entries()) {
    const node = nodesById.get(id);
    if (!node) continue;
    const cf = node.callFrame;
    rows.push({
      functionName: cf.functionName || '(anonymous)',
      url: cf.url,
      line: cf.lineNumber,
      selfMs: selfMicros / 1000,
    });
  }
  const byUrl = new Map();
  for (const r of rows) {
    const key = r.url || '(no url)';
    byUrl.set(key, (byUrl.get(key) || 0) + r.selfMs);
  }
  return {
    rows: rows.sort((a, b) => b.selfMs - a.selfMs),
    byUrl: [...byUrl.entries()].sort((a, b) => b[1] - a[1]),
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ baseURL });
  await context.addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
  }, QA_AUTH_STORAGE);

  const page = await context.newPage();
  await page.route('**/api/users/profile**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(JSON.parse(QA_AUTH_STORAGE.caredroid_user_profile)) }),
  );
  await page.route('**/api/tenant/context**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ organizationId: 'qa-organization', organizationName: 'QA', workspaceId: 'operations', workspaceName: 'Ops', userId: 'responsive-qa-user', role: 'admin', subscriptionPlan: 'enterprise' }) }),
  );
  await page.route('**/api/tools**', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tools: [], count: 0 }) });
  });
  await page.route('**/api/config/system**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rag: { enabled: true }, session: { idleTimeoutMs: 1800000 } }) }),
  );
  await page.route('**/api/ai/remaining-queries**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ remaining: 100, limit: 100 }) }),
  );
  await page.route('**/api/subscriptions/current**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ plan: 'professional', status: 'active' }) }),
  );

  const cdp = await context.newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  await cdp.send('Profiler.start');

  await page.goto(routePath, { waitUntil: 'commit', timeout: 60_000 });
  await page.waitForFunction(() => !document.querySelector('.app-init-screen'), undefined, { timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const loader = document.querySelector('.page-loader');
      const shell = document.querySelector('.app-shell-main-content') || document.querySelector('.app-shell-page-body');
      if (loader) return false;
      if (!shell) return false;
      const r = shell.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    },
    undefined,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(750);

  const { profile } = await cdp.send('Profiler.stop');
  await browser.close();

  const { rows, byUrl } = aggregateProfile(profile);

  console.log(`\n=== Top self-time by URL for ${routePath} ===`);
  for (const [url, ms] of byUrl.slice(0, 15)) {
    console.log(`${ms.toFixed(1).padStart(8)}ms  ${url}`);
  }

  console.log(`\n=== Top self-time by function for ${routePath} ===`);
  for (const r of rows.slice(0, 25)) {
    console.log(`${r.selfMs.toFixed(1).padStart(7)}ms  ${r.functionName}  (${r.url}:${r.line})`);
  }
})();
