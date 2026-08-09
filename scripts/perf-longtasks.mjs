/**
 * Capture raw `PerformanceObserver({type:'longtask'})` entries for a single
 * route -- the exact browser API `e2e/performance.spec.mjs`'s TBT number is
 * computed from (`sum(max(0, duration - 50))`). Complements `perf-trace.mjs`
 * and `perf-profile.mjs`, neither of which capture this directly: Cycle 90
 * found CDP Tracing's root-level "task-shaped" events summed to roughly a
 * third of what the live TBT figure implies for `calculator-bmi`, an
 * unresolved gap between trace-event inference and the browser's own
 * long-task accounting. This script closes that gap by reading the ground
 * truth directly instead of inferring it from CDP trace event nesting.
 *
 * Usage:
 *   QA_BASE_URL=http://localhost:5195 node scripts/perf-longtasks.mjs /clinical/alerts
 *
 * Env: same QA_BASE_URL / QA_CHROMIUM_EXECUTABLE convention as the other perf-*.mjs scripts.
 */
import { chromium } from 'playwright-core';
import {
  seedQaAuth,
  installQaNetworkStubs,
  dismissOverlays,
  waitForAppReady,
} from '../e2e/responsive-qa.helpers.mjs';

const executablePath =
  process.env.QA_CHROMIUM_EXECUTABLE ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseURL = process.env.QA_BASE_URL || 'http://localhost:3000';
const routePath = process.argv[2] || '/clinical/alerts';

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  // Byte-for-byte the same setup e2e/performance.spec.mjs uses, not a
  // hand-rolled approximation -- a first pass with inline equivalents here
  // produced a materially different (much lower, noisier) reading than the
  // official suite, and rather than trust the new script blindly, this
  // reuses the project's own real helpers to remove that variable entirely.
  await seedQaAuth(page);
  await installQaNetworkStubs(page);

  await page.addInitScript(() => {
    window.__longTasks = [];
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__longTasks.push({
            startTime: entry.startTime,
            duration: entry.duration,
            name: entry.name,
            attribution: (entry.attribution || []).map((a) => ({
              name: a.name,
              containerType: a.containerType,
              containerSrc: a.containerSrc,
            })),
          });
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      // not supported in this browser build
    }
  });

  await page.goto(routePath, { waitUntil: 'commit', timeout: 60_000 });
  await waitForAppReady(page);
  await dismissOverlays(page);
  await page.waitForTimeout(750);

  const longTasks = await page.evaluate(() => window.__longTasks || []);
  await browser.close();

  const sorted = [...longTasks].sort((a, b) => a.startTime - b.startTime);
  const totalDuration = sorted.reduce((sum, t) => sum + t.duration, 0);
  const tbtApprox = sorted.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0);
  const durations = sorted.map((t) => t.duration);

  console.log(`\n=== Raw longtask entries for ${routePath}: ${sorted.length} tasks ===`);
  for (const t of sorted) {
    console.log(
      `  start=${t.startTime.toFixed(1).padStart(8)}ms  duration=${t.duration.toFixed(1).padStart(7)}ms  name=${t.name}` +
        (t.attribution.length ? `  attribution=${JSON.stringify(t.attribution)}` : ''),
    );
  }
  console.log(`\n=== Summary for ${routePath} ===`);
  console.log(`  task count:        ${sorted.length}`);
  console.log(`  total duration:    ${totalDuration.toFixed(1)}ms`);
  console.log(`  TBT (sum>50 floor): ${tbtApprox.toFixed(1)}ms`);
  console.log(`  max single task:   ${durations.length ? Math.max(...durations).toFixed(1) : 0}ms`);
  console.log(`  median task:       ${durations.length ? durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)].toFixed(1) : 0}ms`);
})();
