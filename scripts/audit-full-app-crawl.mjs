#!/usr/bin/env node
/**
 * Crawls every static (non-parameterized) CANONICAL_ROUTES path against a real
 * running dev stack (`npm run dev`, default http://localhost:5190) and flags:
 * uncaught page errors (crashes), blank renders, and horizontal layout
 * overflow. Screenshots only pages that flag something.
 *
 * The browser is relaunched every ROTATE_EVERY pages. This is required, not
 * cosmetic: a single long-lived Chromium instance navigating 150+ pages in a
 * row hits net::ERR_INSUFFICIENT_RESOURCES partway through and every
 * subsequent page renders blank with zero console errors — indistinguishable
 * from a real per-page bug unless you know to look for it (Cycle 154 lost
 * real time to this before isolating it: 24 of 25 "blank" pages from a
 * single-browser run rendered fine seconds later in a fresh browser).
 * Rotating keeps each browser's page count low enough to never hit the limit.
 *
 * Usage: node scripts/audit-full-app-crawl.mjs [baseURL]
 * Output: qa/full-app-crawl/report.json (+ screenshots for flagged pages)
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(__dirname, '..');
const outDir = join(repoRoot, 'qa', 'full-app-crawl');
const shotDir = join(outDir, 'screenshots');
mkdirSync(shotDir, { recursive: true });

const baseURL = process.argv[2] || process.env.QA_BASE_URL || 'http://localhost:5190';
const EDGE_PATH =
  process.env.QA_CHROMIUM_EXECUTABLE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROTATE_EVERY = 15;

function extractBlock(src, startMarker) {
  const start = src.indexOf(startMarker);
  if (start === -1) return null;
  const braceStart = src.indexOf('{', start);
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(braceStart + 1, i);
    }
  }
  return null;
}

const routesConfigSrc = readFileSync(join(repoRoot, 'src/config/routes.config.ts'), 'utf8')
  .split('\n')
  .map((line) => line.replace(/\/\/.*$/, ''))
  .join('\n');
const block = extractBlock(routesConfigSrc, 'export const CANONICAL_ROUTES');
const routes = {};
for (const m of block.matchAll(/(\w+):\s*'([^']+)'/g)) {
  routes[m[1]] = m[2];
}

const staticRoutes = Object.entries(routes).filter(([, path]) => !path.includes(':'));
const dynamicRoutes = Object.entries(routes).filter(([, path]) => path.includes(':'));

console.log(
  `${staticRoutes.length} static routes to crawl (browser rotates every ${ROTATE_EVERY} pages), ${dynamicRoutes.length} dynamic (skipped, need real ids).`,
);

function authStorage() {
  return {
    caredroid_access_token: 'full-app-crawl-token',
    caredroid_user_profile: JSON.stringify({
      id: 'full-app-crawl-user',
      email: 'crawl@caredroid.local',
      name: 'Full App Crawl',
      role: 'super_admin',
      fullName: 'Full App Crawl',
      isEmailVerified: true,
      twoFactorEnabled: false,
    }),
  };
}

async function newBrowserContext() {
  const browser = await chromium.launch({ executablePath: EDGE_PATH });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await context.addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
  }, authStorage());
  return { browser, context };
}

async function main() {
  const results = [];
  let { browser, context } = await newBrowserContext();
  let pagesOnThisBrowser = 0;

  for (const [name, path] of staticRoutes) {
    if (pagesOnThisBrowser >= ROTATE_EVERY) {
      await browser.close();
      ({ browser, context } = await newBrowserContext());
      pagesOnThisBrowser = 0;
    }
    pagesOnThisBrowser++;

    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    let httpStatus = null;
    let navError = null;
    try {
      const resp = await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle', timeout: 20000 });
      httpStatus = resp ? resp.status() : null;
      await page.waitForTimeout(1200);
    } catch (err) {
      navError = err.message;
    }

    let bodyText = '';
    let scrollWidth = 0;
    let clientWidth = 0;
    try {
      bodyText = await page.evaluate(() => document.body?.innerText?.trim() || '');
      scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    } catch {
      /* page may have crashed hard; leave defaults */
    }

    const isBlank = bodyText.length < 20;
    const hasOverflow = scrollWidth > clientWidth + 24;
    const hasCrash = pageErrors.length > 0 || Boolean(navError);
    const flagged = isBlank || hasOverflow || hasCrash;

    const row = {
      name,
      path,
      httpStatus,
      navError,
      isBlank,
      bodyPreview: bodyText.slice(0, 80),
      hasOverflow,
      overflowBy: hasOverflow ? scrollWidth - clientWidth : 0,
      pageErrors,
      consoleErrorCount: consoleErrors.length,
      consoleErrorSample: consoleErrors.slice(0, 3),
    };
    results.push(row);

    if (flagged) {
      const safeName = name.replace(/[^\w-]/g, '_');
      try {
        await page.screenshot({ path: join(shotDir, `${safeName}.png`), fullPage: false });
        row.screenshot = `screenshots/${safeName}.png`;
      } catch {
        /* ignore screenshot failure */
      }
      console.log(`FLAGGED ${name} (${path}) — crash:${hasCrash} blank:${isBlank} overflow:${hasOverflow}`);
    }

    await page.close();
  }

  await browser.close();

  const summary = {
    generatedAt: new Date().toISOString(),
    totalCrawled: results.length,
    totalSkippedDynamic: dynamicRoutes.length,
    crashed: results.filter((r) => r.pageErrors.length > 0 || r.navError).length,
    blank: results.filter((r) => r.isBlank).length,
    overflow: results.filter((r) => r.hasOverflow).length,
    clean: results.filter((r) => !r.isBlank && !r.hasOverflow && r.pageErrors.length === 0 && !r.navError).length,
  };
  writeFileSync(
    join(outDir, 'report.json'),
    JSON.stringify(
      {
        summary,
        note:
          'Any row flagged here should be re-checked in a single fresh browser instance before treating it as real — a page late in a long crawl can show a transient net::ERR_INSUFFICIENT_RESOURCES blank render even with browser rotation under heavy load. See script header comment.',
        skippedDynamicRoutes: dynamicRoutes.map(([n, p]) => ({ name: n, path: p })),
        results,
      },
      null,
      2,
    ),
  );

  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Full report: ${join(outDir, 'report.json')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
