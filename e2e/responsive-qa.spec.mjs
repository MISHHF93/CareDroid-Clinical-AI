/**
 * Responsive QA — runs matrix pages at each viewport; fails on document/body horizontal overflow.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RESPONSIVE_QA_VIEWPORTS,
  RESPONSIVE_QA_PAGES,
  groupResponsiveQaPagesByPath,
} from '../src/data/responsiveQaMatrix.js';
import { dismissOverlays, measurePageOverflow } from './responsive-qa.helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_PATH = join(__dirname, '..', 'qa', 'responsive-qa-results.json');

/** @type {import('../src/data/responsiveQaMatrix.js').ResponsiveQaPage[]} */
const PAGES = RESPONSIVE_QA_PAGES;

const pathGroups = groupResponsiveQaPagesByPath();

for (const pageDef of PAGES) {
  for (const viewport of RESPONSIVE_QA_VIEWPORTS) {
    test(`${pageDef.id} @ ${viewport.id}`, async ({ page }, testInfo) => {
      const projectName = testInfo.project.name;

      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto(pageDef.path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForFunction(
        () => !document.querySelector('.app-init-screen'),
        undefined,
        { timeout: 45_000 }
      );
      await page.waitForSelector('.app-shell-page-body', { state: 'visible', timeout: 45_000 });

      await page.waitForTimeout(150);
      await dismissOverlays(page);

      const url = page.url();
      expect(url).not.toContain('/auth');
      expect(url).toContain(pageDef.path.split('?')[0]);

      const overflow = await measurePageOverflow(page);

      test.info().attach('overflow-report', {
        body: JSON.stringify(overflow, null, 2),
        contentType: 'application/json',
      });

      if (!overflow.pass) {
        const detail = overflow.offenders
          .map((o) => `${o.selector} (+${o.overflowPx}px past viewport ${o.viewport})`)
          .join('; ');
        expect(
          overflow.pass,
          `[${projectName}] ${pageDef.id} ${viewport.id}: horizontal overflow — ${detail}`
        ).toBe(true);
      }
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
