/**
 * Automated accessibility QA — axe-core scan across a curated set of representative pages.
 * First automated a11y coverage for the app; see docs/accessibility-audit.md for the baseline.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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
const RESULTS_PATH = join(__dirname, '..', 'qa', 'a11y-results.json');

/** One representative page per major UI archetype — dashboard, chat, catalog, form, list, map, table. */
const A11Y_PAGES = [
  { id: 'dashboard', label: 'Command Dashboard', path: '/dashboard' },
  { id: 'assistant', label: 'AI Assistant / Chat', path: '/assistant' },
  { id: 'tools-overview', label: 'Tool Library', path: '/tools' },
  { id: 'calculators-hub', label: 'Calculators Hub', path: '/tools/calculators' },
  { id: 'calculator-bmi', label: 'BMI Calculator (form)', path: '/tools/calculators/bmi' },
  { id: 'clinical-alerts', label: 'Clinical Alerts', path: '/clinical/alerts' },
  { id: 'hospital-map', label: 'Hospital Map', path: '/hospital-map' },
  { id: 'devices', label: 'Device Fleet Management', path: '/devices' },
];

/** WCAG 2.1 A/AA is the baseline every page must clear; best-practice rules are reported, not enforced yet. */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const allResults = [];

test.afterAll(async () => {
  mkdirSync(dirname(RESULTS_PATH), { recursive: true });
  writeFileSync(RESULTS_PATH, JSON.stringify(allResults, null, 2));
});

for (const pageDef of A11Y_PAGES) {
  test(`a11y: ${pageDef.id}`, async ({ page }, testInfo) => {
    await page.goto(pageDef.path, { waitUntil: 'commit', timeout: 60_000 });
    await waitForAppReady(page);
    await page.waitForTimeout(150);
    await dismissOverlays(page);

    const axeResults = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

    const violationSummary = axeResults.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.helpUrl,
      nodeCount: v.nodes.length,
      sample: v.nodes[0]?.target,
    }));

    allResults.push({
      pageId: pageDef.id,
      path: pageDef.path,
      violationCount: axeResults.violations.length,
      violations: violationSummary,
    });

    testInfo.attach('axe-violations', {
      body: JSON.stringify(violationSummary, null, 2),
      contentType: 'application/json',
    });

    const seriousOrCritical = axeResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );

    expect(
      seriousOrCritical,
      `[${pageDef.id}] ${seriousOrCritical.length} serious/critical WCAG violation(s): ${seriousOrCritical
        .map((v) => `${v.id} (${v.nodes.length} node(s)) — ${v.helpUrl}`)
        .join('; ')}`,
    ).toEqual([]);
  });
}
