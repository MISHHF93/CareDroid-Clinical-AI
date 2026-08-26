/**
 * Responsive QA — runs matrix pages at each viewport; fails on document/body horizontal overflow.
 */

import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RESPONSIVE_QA_VIEWPORTS,
  RESPONSIVE_QA_PAGES,
  groupResponsiveQaPagesByPath,
} from '../src/data/responsiveQaMatrix.js';
import { getRouteByPath, ROUTE_RECORDS, normalizeRoutePath } from '../src/config/routes.config.js';
import {
  dismissOverlays,
  installQaNetworkStubs,
  measurePageOverflow,
  measureVisibleElementOverlaps,
  measureVerticalScrollAccess,
  seedQaAuth,
  waitForAppReady,
} from './responsive-qa.helpers.mjs';

// Mirrors router.tsx's own `<Route path="..." element={<ToolsRedirect />}>`
// mount list exactly (search that file for "handled by ToolsRedirect") --
// every one of these paths resolves via buildEmergencyToolsRedirect() to
// /emergency/tools?...&open=<id>, not a literal continuation of itself.
// CANONICAL_ROUTES.developerCatalog ('/tools/catalog') and
// ED_UNIFIED_PUBLIC_ROUTES.calculators ('/calculators') are also mounted to
// ToolsRedirect but both already fall under the prefixes below.
const TOOLS_REDIRECT_PATH_PREFIXES = [
  '/tools/',
  '/calculators',
  '/scores',
  '/pharmacy',
  '/radiology',
  '/search',
  '/knowledge-base',
  '/digital-twin',
  /^\/operations\/[^/]+$/,
];

// 2026-08-25: getRouteByPath() (imported above) only ever searches
// CANONICAL_ROUTE_MAP -- a genuinely separate, ~800-line array from
// ROUTE_RECORDS (routes.config.ts, exported a few hundred lines later) that
// isn't a subset/superset of it. Real app code (canonicalAccess.ts,
// emergencyRoleNavigationModel.ts, lib/navigation.ts, and others) reads
// getRouteByPath() directly, so this isn't just a test blind spot -- but
// reconciling two ~800-line parallel route registries is its own dedicated
// investigation, not something to fix from inside a test file. This local
// helper only closes the gap THIS test needs: a plain exact-path-or-alias
// lookup against ROUTE_RECORDS (no dynamic :param matching, since every
// case found so far -- e.g. /assistant via ASSISTANT_ROUTE_ALIASES -- is a
// literal string), so pages whose only "redirect" metadata lives in
// ROUTE_RECORDS (not CANONICAL_ROUTE_MAP) stop being misreported as broken.
function findRouteRecordByPath(path) {
  const normalized = normalizeRoutePath(path);
  return (
    ROUTE_RECORDS.find((record) => normalizeRoutePath(record.path) === normalized) ||
    ROUTE_RECORDS.find((record) =>
      (record.aliases || []).some((alias) => normalizeRoutePath(alias) === normalized),
    ) ||
    null
  );
}

test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  await seedQaAuth(page);
  await installQaNetworkStubs(page);
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_PATH = join(__dirname, '..', 'qa', 'responsive-qa-results.json');

/** @type {import('../src/data/responsiveQaMatrix.js').ResponsiveQaPage[]} */
const PAGES = RESPONSIVE_QA_PAGES;

const pathGroups = groupResponsiveQaPagesByPath();

/** Warm Vite bundles before parallel cells (avoids first-test cold-start timeouts). */
test.beforeAll(async ({ request }) => {
  const warmPaths = [
    '/dashboard',
    '/tools/catalog',
    '/tools/calculators',
    '/tools/calculators/has-bled',
    '/fleet/command',
  ];
  for (const path of warmPaths) {
    await request.get(path).catch(() => {});
  }
});

for (const pageDef of PAGES) {
  for (const viewport of RESPONSIVE_QA_VIEWPORTS) {
    test(`${pageDef.id} @ ${viewport.id}`, async ({ page }, testInfo) => {
      const projectName = testInfo.project.name;

      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto(pageDef.path, { waitUntil: 'commit', timeout: 90_000 });
      await waitForAppReady(page);

      await page.waitForTimeout(150);
      await dismissOverlays(page);

      const url = page.url();
      expect(url).not.toContain('/auth');
      // 2026-08-25: skip the strict post-navigation path match for any page
      // that's a deliberate redirect rather than content of its own --
      // asserting a fixed destination string against one would be exactly
      // the kind of fixture-drifts-from-real-behavior trap this suite's own
      // auth fixture just needed fixing for (see seedQaAuth's authMode
      // history). Three independent signals cover this: (1) the route
      // registry's own first-class markers (routes.config.ts's `redirectTo`
      // field, e.g. predictive-analytics -> command-center?view=predictive;
      // or `status: 'redirect'` on an alias target, e.g. /dashboard ->
      // EmergencyDefaultRedirect's role-dependent "smart default" page) --
      // checked generically so this also covers any other redirect-declared
      // page in the matrix not yet individually found broken, via BOTH
      // getRouteByPath() (CANONICAL_ROUTE_MAP) and findRouteRecordByPath()
      // (ROUTE_RECORDS, a separate array getRouteByPath doesn't search --
      // see that helper's own comment; this is how /assistant, whose
      // status: 'redirect' only lives in ROUTE_RECORDS, was found); (2)
      // pageDef.expectRedirect, a manual override for router.tsx's ad-hoc
      // specialty-shortcut redirect (the 9 pediatrics-obgyn tier-c tools),
      // which isn't expressed via the formal route registry at all; (3)
      // TOOLS_REDIRECT_PATH_PREFIXES below -- discovered the same day as (2)
      // when a broader single-viewport sweep across the full matrix (not
      // just the "dashboard"-filtered slice) showed the identical failure
      // shape hitting every tier-a calculator and tier-b workflow-assistant
      // page too: their catalog-advertised paths (/tools/calculator/X,
      // /scores/X, etc.) all route through router.tsx's ToolsRedirect,
      // which -- same as the specialty-shortcut case -- lands on
      // /emergency/tools?...&open=X, not a literal continuation of the
      // original path. This mirrors router.tsx's own <Route path="..."
      // element={<ToolsRedirect />}> mount list exactly (not re-derived by
      // guessing) so it can't quietly drift out of sync with which prefixes
      // actually redirect. Either way, the real point of this test --
      // overflow/overlap/scroll checks below -- still runs against wherever
      // the redirect actually lands.
      const registryRoute = getRouteByPath(pageDef.path);
      const routeRecord = findRouteRecordByPath(pageDef.path);
      const matchesToolsRedirectPrefix = TOOLS_REDIRECT_PATH_PREFIXES.some((prefix) =>
        typeof prefix === 'string' ? pageDef.path.startsWith(prefix) : prefix.test(pageDef.path),
      );
      const isKnownRedirect =
        pageDef.expectRedirect ||
        Boolean(registryRoute?.redirectTo) ||
        registryRoute?.status === 'redirect' ||
        Boolean(routeRecord?.redirectTo) ||
        routeRecord?.status === 'redirect' ||
        matchesToolsRedirectPrefix;
      if (!isKnownRedirect) {
        expect(url).toContain(pageDef.path.split('?')[0]);
      }

      const overflow = await measurePageOverflow(page);
      const overlaps = await measureVisibleElementOverlaps(page);
      const verticalScroll = await measureVerticalScrollAccess(page);

      test.info().attach('overflow-report', {
        body: JSON.stringify(overflow, null, 2),
        contentType: 'application/json',
      });
      test.info().attach('vertical-scroll-report', {
        body: JSON.stringify(verticalScroll, null, 2),
        contentType: 'application/json',
      });
      test.info().attach('overlap-report', {
        body: JSON.stringify(overlaps, null, 2),
        contentType: 'application/json',
      });

      if (!overflow.pass) {
        const detail = overflow.offenders
          .map((o) => `${o.selector} (+${o.overflowPx}px past viewport ${o.viewport}; left ${o.left}, width ${o.width}, right ${o.right})`)
          .join('; ');
        expect(
          overflow.pass,
          `[${projectName}] ${pageDef.id} ${viewport.id}: horizontal overflow — ${detail}`
        ).toBe(true);
      }

      expect(
        verticalScroll.pass,
        `[${projectName}] ${pageDef.id} ${viewport.id}: content scrollport is not usable — ${JSON.stringify(verticalScroll)}`
      ).toBe(true);

      expect(
        overlaps.pass,
        `[${projectName}] ${pageDef.id} ${viewport.id}: visible element overlap — ${JSON.stringify(overlaps.offenders)}`
      ).toBe(true);
    });
  }
}

test.afterAll(async () => {
  mkdirSync(dirname(RESULTS_PATH), { recursive: true });
  const stub = {
    note: 'Playwright JSON reporter writes full results; see qa/RESPONSIVE_QA_REPORT.md from npm run qa:responsive',
    pages: PAGES.length,
    viewports: RESPONSIVE_QA_VIEWPORTS.length,
    uniquePaths: pathGroups.size,
  };
  writeFileSync(RESULTS_PATH, `${JSON.stringify(stub, null, 2)}\n`);
});
