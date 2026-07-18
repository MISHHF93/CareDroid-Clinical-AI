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
// Per-page files, not one shared array + a single afterAll: fullyParallel +
// retries can run this file's tests across multiple worker processes, each
// with its own module instance, so a shared array + one afterAll write only
// ever captures whichever worker happened to finish last (silently dropping
// every other page's results). Writing immediately per-test, keyed by page,
// is race-free regardless of worker/retry topology.
const RESULTS_DIR = join(__dirname, '..', 'qa', 'a11y-results');

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
  // Interactive-Intelligence workspaces (Cy79 coverage growth).
  { id: 'reception-workspace', label: 'Reception Workspace (interactive AI)', path: '/emergency/reception' },
  { id: 'ems-pipeline', label: 'EMS Pipeline (interactive AI)', path: '/emergency/ems' },
  // Cy95 coverage growth: 5 more archetypes (patient board, chart-heavy
  // dashboard, settings form, triage queue, interactive scenario list).
  { id: 'emergency-whiteboard', label: 'Emergency Whiteboard (patient board)', path: '/emergency/whiteboard' },
  { id: 'emergency-analytics', label: 'Emergency Analytics (charts)', path: '/emergency/analytics' },
  { id: 'emergency-settings', label: 'Emergency Settings (form)', path: '/emergency/settings' },
  { id: 'triage-queue', label: 'Triage Queue', path: '/triage' },
  { id: 'simulation', label: 'Medical Simulation Suite', path: '/simulation' },
];

/** WCAG 2.1 A/AA is the baseline every page must clear; best-practice rules are reported, not enforced yet. */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

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

    mkdirSync(RESULTS_DIR, { recursive: true });
    writeFileSync(
      join(RESULTS_DIR, `${pageDef.id}.json`),
      JSON.stringify(
        {
          pageId: pageDef.id,
          path: pageDef.path,
          violationCount: axeResults.violations.length,
          violations: violationSummary,
        },
        null,
        2,
      ),
    );

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
