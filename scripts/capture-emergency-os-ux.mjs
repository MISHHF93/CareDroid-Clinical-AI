#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  dismissOverlays,
  installQaNetworkStubs,
  measurePageOverflow,
  measureVerticalScrollAccess,
  measureVisibleElementOverlaps,
  seedQaAuth,
} from '../e2e/responsive-qa.helpers.mjs';

const phase = process.env.ED_UX_PHASE || 'before';
const baseURL = process.env.QA_BASE_URL || 'http://localhost:3000';
const root = process.cwd();
const screenshotDir = join(root, 'qa', 'emergency-os-ux-screenshots', phase);
const diagnosticsPath = join(
  root,
  'qa',
  'emergency-os-ux-screenshots',
  `${phase}-diagnostics.json`,
);

const viewports = [
  { id: 'desktop', width: 1440, height: 1000 },
  { id: 'mobile', width: 390, height: 844 },
];

const routes = [
  { id: 'emergency-root', path: '/workspace/emergency' },
  { id: 'emergency-dashboard', path: '/workspace/emergency/dashboard' },
  { id: 'emergency-command-center', path: '/workspace/emergency/command-center' },
  { id: 'emergency-patient-path', path: '/workspace/emergency/patient-path' },
  { id: 'emergency-whiteboard', path: '/workspace/emergency/whiteboard' },
  { id: 'emergency-queues', path: '/workspace/emergency/queues' },
  { id: 'emergency-pre-arrival', path: '/workspace/emergency/pre-arrival' },
  { id: 'emergency-triage', path: '/workspace/emergency/triage' },
  { id: 'emergency-referrals', path: '/workspace/emergency/referrals' },
  { id: 'emergency-boarding', path: '/workspace/emergency/boarding' },
  { id: 'emergency-capacity', path: '/workspace/emergency/capacity' },
  { id: 'emergency-throughput', path: '/workspace/emergency/throughput' },
  { id: 'emergency-knowledge', path: '/workspace/emergency/knowledge' },
  { id: 'emergency-automations', path: '/workspace/emergency/automations' },
  { id: 'emergency-analytics', path: '/workspace/emergency/analytics' },
  { id: 'emergency-automation-roi', path: '/workspace/emergency/automation-roi' },
  { id: 'emergency-director', path: '/workspace/emergency/director' },
  { id: 'emergency-charge-nurse', path: '/workspace/emergency/charge-nurse' },
  { id: 'emergency-demo', path: '/workspace/emergency/demo' },
];

async function collectPageSummary(page) {
  return page.evaluate(() => {
    const activeTab = document.querySelector('.workspace-subpage-tab--active');
    const headings = [...document.querySelectorAll('h1, h2, h3')]
      .map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 12);
    const shellCount = document.querySelectorAll(
      '.app-shell, .app-shell-page, .workspace-home',
    ).length;
    const visibleCards = document.querySelectorAll(
      '.workspace-panel, .workspace-automation-card, .workspace-capability-card, .emergency-queue-card',
    ).length;
    const demoLabels = [...document.body.querySelectorAll('*')].filter((node) =>
      /demo data|demo\/local fallback|no live integration/i.test(node.textContent || ''),
    ).length;

    return {
      pathname: window.location.pathname,
      activeTab: activeTab?.textContent?.replace(/\s+/g, ' ').trim() || null,
      headings,
      shellCount,
      visibleCards,
      demoLabels,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
}

mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(45_000);
page.setDefaultNavigationTimeout(60_000);
await seedQaAuth(page);
await installQaNetworkStubs(page);

const diagnostics = [];

for (const route of routes) {
  for (const viewport of viewports) {
    const url = new URL(route.path, baseURL).toString();
    const screenshotName = `${route.id}-${viewport.id}.png`;
    const screenshotPath = join(screenshotDir, screenshotName);

    console.log(`[${phase}] ${route.path} @ ${viewport.id}`);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const record = {
      route,
      viewport,
      screenshot: screenshotPath,
      ok: false,
      errors: [],
    };

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.workspace-home, .app-shell-page-body', { timeout: 45_000 });
      await page.waitForTimeout(250);
      await dismissOverlays(page);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const [overflow, verticalScroll, overlaps, summary] = await Promise.all([
        measurePageOverflow(page),
        measureVerticalScrollAccess(page),
        measureVisibleElementOverlaps(page),
        collectPageSummary(page),
      ]);

      Object.assign(record, {
        ok: true,
        overflow,
        verticalScroll,
        overlaps,
        summary,
      });
    } catch (error) {
      record.errors.push(error instanceof Error ? error.message : String(error));
    }

    diagnostics.push(record);
  }
}

await browser.close();

writeFileSync(
  diagnosticsPath,
  `${JSON.stringify({ phase, generatedAt: new Date().toISOString(), diagnostics }, null, 2)}\n`,
);

const failures = diagnostics.filter((item) => !item.ok);
const overflowFailures = diagnostics.filter((item) => item.overflow && !item.overflow.pass);
const overlapFailures = diagnostics.filter((item) => item.overlaps && !item.overlaps.pass);
console.log(
  `Captured ${diagnostics.length} screenshots for ${phase}. Failures: ${failures.length}, overflow: ${overflowFailures.length}, overlaps: ${overlapFailures.length}.`,
);

if (failures.length) {
  process.exitCode = 1;
}
