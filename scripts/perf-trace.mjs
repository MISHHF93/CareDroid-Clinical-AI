/**
 * Trace a single route via Chrome DevTools Protocol `Tracing` (not `Profiler`),
 * and bucket main-thread time by rendering category: Script, Style, Layout,
 * Paint/Composite, Parse HTML, GC.
 *
 * `perf-profile.mjs` wraps CDP `Profiler.stop()` -- pure V8 sampling. It can
 * name which *function* burned CPU, but any cost the sampler can't attribute
 * to a JS stack frame (layout, style recalc, paint, GC pauses between
 * samples) all falls into an undifferentiated `(program)`/`(no url)` bucket.
 * That made it impossible to tell "this route does expensive rendering work"
 * apart from "this route is compiling/executing more script" -- exactly the
 * open question the Cycle 86/87 calculator-bmi investigation ran into and
 * flagged as needing real CDP Tracing instead. This script is that tool.
 *
 * Usage:
 *   QA_BASE_URL=http://localhost:5195 node scripts/perf-trace.mjs /clinical/alerts
 *
 * Env: same QA_BASE_URL / QA_CHROMIUM_EXECUTABLE convention as perf-profile.mjs.
 *
 * Interpreting output: totals are summed `dur` (microseconds -> ms) of
 * Chrome's own "complete" (ph:'X') trace events, grouped into the category
 * buckets below, plus a raw top-20 by individual event name for detail.
 * As with perf-profile.mjs: a production build only, via `vite preview` --
 * the URL check (hashed dist assets, not /src/*.tsx) is the tell.
 */
import { chromium } from 'playwright-core';

const executablePath =
  process.env.QA_CHROMIUM_EXECUTABLE ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseURL = process.env.QA_BASE_URL || 'http://localhost:5190';
const routePath = process.argv[2] || '/clinical/alerts';

const QA_AUTH_STORAGE = {
  caredroid_access_token: 'responsive-qa-token',
  caredroid_user_profile: JSON.stringify({
    id: 'responsive-qa-user',
    email: 'qa@caredroid.local',
    name: 'Responsive QA',
    role: 'admin',
    fullName: 'Responsive QA',
    isEmailVerified: true,
    twoFactorEnabled: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }),
};

// Chrome's own timeline event names, grouped into the categories this
// investigation actually cares about telling apart.
const CATEGORY_BY_EVENT_NAME = {
  // Script: parsing/compiling/running JS -- what Profiler.stop() already saw.
  EvaluateScript: 'Script',
  FunctionCall: 'Script',
  'V8.Compile': 'Script',
  'v8.compile': 'Script',
  Compile: 'Script',
  CompileScript: 'Script',
  CompileCode: 'Script',
  'v8.evaluateModule': 'Script',
  RunMicrotasks: 'Script',
  TimerFire: 'Script',
  // Style: recomputing which CSS rules apply.
  RecalculateStyles: 'Style',
  ScheduleStyleRecalculation: 'Style',
  UpdateLayoutTree: 'Style',
  // Layout: computing geometry -- the actual "expensive render" signature
  // a sampling profiler cannot see at all.
  Layout: 'Layout',
  UpdateLayerTree: 'Layout',
  // Paint/Composite: rasterizing and compositing pixels.
  Paint: 'Paint/Composite',
  PaintImage: 'Paint/Composite',
  CompositeLayers: 'Paint/Composite',
  RasterTask: 'Paint/Composite',
  Rasterize: 'Paint/Composite',
  // Parse HTML: streaming HTML tokenization/DOM construction.
  ParseHTML: 'Parse HTML',
  ParseAuthorStyleSheet: 'Parse HTML',
  // GC: collector pauses, invisible to a pure-sampling profiler between ticks.
  MinorGC: 'GC',
  MajorGC: 'GC',
  GCEvent: 'GC',
};

function categorize(name) {
  return CATEGORY_BY_EVENT_NAME[name] || 'Other';
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
  const traceEvents = [];
  cdp.on('Tracing.dataCollected', (params) => {
    traceEvents.push(...params.value);
  });
  const tracingComplete = new Promise((resolve) => {
    cdp.once('Tracing.tracingComplete', resolve);
  });

  await cdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    categories: [
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',
      'disabled-by-default-devtools.timeline.frame',
      'toplevel',
      'blink.user_timing',
      'loading',
      'v8',
      'disabled-by-default-v8.compile',
    ].join(','),
  });

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

  await cdp.send('Tracing.end');
  await tracingComplete;
  await browser.close();

  // A raw trace spans every process Chrome runs -- the renderer's main
  // thread, its own V8 background compiler/parser threads, the GPU process,
  // thread-pool workers -- summed indiscriminately that wildly overcounts
  // wall-clock cost, since those threads run in parallel and most of them
  // (background streaming parse/compile in particular) are specifically
  // designed NOT to block the main thread. TBT only cares about the main
  // thread, so isolate it via the 'thread_name' metadata event Chrome emits
  // for every (pid, tid) pair.
  const threadNameByKey = new Map();
  for (const e of traceEvents) {
    if (e.ph === 'M' && e.name === 'thread_name' && e.args?.name) {
      threadNameByKey.set(`${e.pid}:${e.tid}`, e.args.name);
    }
  }
  const mainThreadKeys = new Set(
    [...threadNameByKey.entries()]
      .filter(([, name]) => name === 'CrRendererMain')
      .map(([key]) => key),
  );

  // "Complete" events (ph:'X') carry their own duration directly and are how
  // Chrome emits the vast majority of devtools.timeline entries (Layout,
  // Paint, EvaluateScript, ...). Async/instant/begin-end-pair events without
  // a 'dur' are excluded rather than approximated.
  const completeEvents = traceEvents.filter(
    (e) => e.ph === 'X' && typeof e.dur === 'number' && mainThreadKeys.has(`${e.pid}:${e.tid}`),
  );

  // Complete events nest (RunTask contains FunctionCall contains EvaluateScript
  // contains Layout, ...). Summing gross durations double-counts every level
  // of nesting and would misleadingly inflate whichever category has the
  // deepest call stacks. Compute real self-time instead -- the same
  // "duration minus time spent in children" a flame chart's bottom-up view
  // shows -- via a stack sweep per (pid, tid) thread, since nesting is only
  // well-defined within a single thread's own event stream.
  function selfTimesForThread(events) {
    const sorted = [...events].sort((a, b) => a.ts - b.ts || b.ts + b.dur - (a.ts + a.dur));
    const stack = [];
    const out = [];
    const roots = [];
    const closeTo = (time) => {
      while (stack.length && stack[stack.length - 1].end <= time) {
        const top = stack.pop();
        const grossMs = (top.end - top.event.ts) / 1000;
        const selfMs = Math.max(grossMs - top.childMs, 0);
        out.push({ name: top.event.name, selfMs });
        if (stack.length) {
          stack[stack.length - 1].childMs += grossMs;
        } else {
          // Depth-0 event: not nested inside anything else on this thread --
          // the closest proxy this trace format has to "one browser task."
          // TBT specifically penalizes a FEW LONG tasks over the same total
          // work spread thin, so this is the shape that actually predicts it.
          roots.push({ name: top.event.name, grossMs });
        }
      }
    };
    for (const e of sorted) {
      closeTo(e.ts);
      stack.push({ event: e, end: e.ts + e.dur, childMs: 0 });
    }
    closeTo(Infinity);
    return { out, roots };
  }

  const eventsByThread = new Map();
  for (const e of completeEvents) {
    const key = `${e.pid}:${e.tid}`;
    if (!eventsByThread.has(key)) eventsByThread.set(key, []);
    eventsByThread.get(key).push(e);
  }
  const perThreadResults = [...eventsByThread.values()].map(selfTimesForThread);
  const selfTimeEntries = perThreadResults.flatMap((r) => r.out);
  const rootEvents = perThreadResults.flatMap((r) => r.roots);

  const byCategory = new Map();
  const byName = new Map();
  for (const { name, selfMs } of selfTimeEntries) {
    const cat = categorize(name);
    byCategory.set(cat, (byCategory.get(cat) || 0) + selfMs);
    byName.set(name, (byName.get(name) || 0) + selfMs);
  }

  const totalMs = [...byCategory.values()].reduce((a, b) => a + b, 0);
  const sortedCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const sortedNames = [...byName.entries()].sort((a, b) => b[1] - a[1]);

  console.log(`\n=== Main-thread self-time by rendering category for ${routePath} (${mainThreadKeys.size} main thread(s), ${completeEvents.length} events, ${totalMs.toFixed(1)}ms total) ===`);
  for (const [cat, ms] of sortedCategories) {
    const pct = totalMs > 0 ? ((ms / totalMs) * 100).toFixed(1) : '0.0';
    console.log(`${ms.toFixed(1).padStart(8)}ms  (${pct.padStart(5)}%)  ${cat}`);
  }

  console.log(`\n=== Top main-thread self-time by raw event name for ${routePath} ===`);
  for (const [name, ms] of sortedNames.slice(0, 20)) {
    console.log(`${ms.toFixed(1).padStart(8)}ms  ${name}  [${categorize(name)}]`);
  }

  // TBT specifically penalizes work shape (a few long uninterrupted tasks),
  // not total main-thread work -- two routes can have equal total self-time
  // and wildly different TBT if one concentrates work into fewer, longer
  // top-level tasks. Root (depth-0) events are this trace format's closest
  // proxy for "one task," so report the longest ones directly.
  const overLongTaskFloor = rootEvents.filter((r) => r.grossMs > 50).sort((a, b) => b.grossMs - a.grossMs);
  console.log(`\n=== Root-level (task-shape) events over the 50ms long-task floor for ${routePath}: ${overLongTaskFloor.length} of ${rootEvents.length} root events ===`);
  for (const r of overLongTaskFloor.slice(0, 10)) {
    console.log(`${r.grossMs.toFixed(1).padStart(8)}ms  ${r.name}`);
  }
})();
