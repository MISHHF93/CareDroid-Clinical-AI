#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
/** Dashboard + ED page paths for screenshot QA (mirrors emergencyPageRenderInventory.ts). */
const EMERGENCY_PAGE_SCREENSHOT_TARGETS = [
  {
    id: 'emergency-command-center',
    label: 'Command Center',
    path: '/emergency/command-center',
    screenshotSlug: '01-emergency-command-center',
  },
  {
    id: 'emergency-whiteboard',
    label: 'Board',
    path: '/emergency/whiteboard',
    screenshotSlug: '02-emergency-whiteboard',
  },
  {
    id: 'emergency-patients',
    label: 'Emergency Patients',
    path: '/emergency/patients',
    screenshotSlug: '03-emergency-patients',
  },
  {
    id: 'emergency-journey',
    label: 'Full Journey',
    path: '/emergency/journey',
    screenshotSlug: '04-emergency-journey',
  },
  { id: 'ems-pipeline', label: 'EMS', path: '/emergency/ems', screenshotSlug: '04-ems-pipeline' },
  {
    id: 'reception-workspace',
    label: 'Reception',
    path: '/emergency/reception',
    screenshotSlug: '05-reception-workspace',
  },
  {
    id: 'smart-intake',
    label: 'Smart Intake',
    path: '/emergency/intake',
    screenshotSlug: '05-smart-intake',
  },
  {
    id: 'queue-intelligence',
    label: 'Queue Intelligence',
    path: '/emergency/queues',
    screenshotSlug: '06-queue-intelligence',
  },
  {
    id: 'department-pulse',
    label: 'Department Pulse',
    path: '/emergency/pulse',
    screenshotSlug: '15-department-pulse',
  },
  {
    id: 'shift-summary',
    label: 'Shift Summary',
    path: '/emergency/shift',
    screenshotSlug: '16-shift-summary',
  },
  {
    id: 'emergency-analytics',
    label: 'Emergency Analytics',
    path: '/emergency/analytics',
    screenshotSlug: '15-emergency-analytics',
  },
  {
    id: 'emergency-settings',
    label: 'Emergency Settings',
    path: '/emergency/settings',
    screenshotSlug: '18-emergency-settings',
  },
  {
    id: 'emergency-help',
    label: 'Help Hub',
    path: '/emergency/help',
    screenshotSlug: '20-emergency-help',
  },
  {
    id: 'medical-tools',
    label: 'Medical Tools',
    path: '/tools',
    screenshotSlug: '14-medical-tools',
  },
  {
    id: 'executive',
    label: 'Executive Command',
    path: '/executive',
    screenshotSlug: 'executive-command',
  },
  {
    id: 'system-health',
    label: 'System Health',
    path: '/system-health',
    screenshotSlug: 'system-health',
  },
  { id: 'saas-health', label: 'SaaS Health', path: '/saas-health', screenshotSlug: 'saas-health' },
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3000';
const outputDir = process.env.PAGE_SCREENSHOT_DIR || join(root, 'qa', 'page-screenshots');
const reportPath = join(outputDir, 'page-screenshot-report.json');
const viewport = {
  width: Number(process.env.PAGE_SCREENSHOT_WIDTH || 1440),
  height: Number(process.env.PAGE_SCREENSHOT_HEIGHT || 1000),
};

function artifactPathFor(slug) {
  return join(outputDir, `${slug}.png`);
}

function relativeArtifactPath(path) {
  return relative(root, path).replaceAll('\\', '/');
}

async function waitForRenderablePage(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 45_000 });
  await page.locator('main, [role="main"], h1').first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(Number(process.env.PAGE_SCREENSHOT_STABILIZE_MS || 750));
}

async function captureTarget(page, target) {
  const url = new URL(target.path, baseUrl).toString();
  const screenshotPath = artifactPathFor(target.screenshotSlug);
  const startedAt = new Date().toISOString();

  try {
    await page.goto(url, { waitUntil: 'commit', timeout: 60_000 });
    await waitForRenderablePage(page);
    const heading = await page
      .locator('h1')
      .first()
      .textContent({ timeout: 5_000 })
      .catch(() => '');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    return {
      ...target,
      ok: true,
      startedAt,
      finalUrl: page.url(),
      heading: heading?.trim() || '',
      screenshotPath: relativeArtifactPath(screenshotPath),
      error: '',
    };
  } catch (error) {
    return {
      ...target,
      ok: false,
      startedAt,
      finalUrl: page.url(),
      heading: '',
      screenshotPath: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport });
const page = await context.newPage();
const results = [];

for (const target of EMERGENCY_PAGE_SCREENSHOT_TARGETS) {
  console.log(`Capturing ${target.path}`);
  results.push(await captureTarget(page, target));
}

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  viewport,
  outputDir: relativeArtifactPath(outputDir),
  total: results.length,
  passed: results.filter((result) => result.ok).length,
  failed: results.filter((result) => !result.ok).length,
  results,
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${relativeArtifactPath(reportPath)}`);

if (report.failed > 0) {
  process.exitCode = 1;
}
