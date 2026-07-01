#!/usr/bin/env node
/**
 * Dashboard resize audit — full-page screenshots + horizontal overflow at key viewports.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dismissOverlays,
  installQaNetworkStubs,
  measurePageOverflow,
  seedQaAuth,
  waitForAppReady,
} from '../e2e/responsive-qa.helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const baseUrl = process.env.QA_BASE_URL || 'http://localhost:8000';
const outputDir = process.env.DASHBOARD_RESIZE_DIR || join(root, 'qa', 'dashboard-resize-audit');

const DASHBOARD_TARGETS = [
  { id: 'dashboard', label: 'Dashboard redirect', path: '/dashboard' },
  { id: 'command-center', label: 'Hospital Command Center', path: '/emergency/command-center' },
  { id: 'whiteboard', label: 'Emergency Whiteboard', path: '/emergency/whiteboard' },
  { id: 'department-pulse', label: 'Department Pulse', path: '/emergency/pulse' },
  { id: 'emergency-analytics', label: 'Emergency Analytics', path: '/emergency/analytics' },
  { id: 'shift-summary', label: 'Shift Summary', path: '/emergency/shift' },
  { id: 'executive', label: 'Executive Command Center', path: '/executive' },
  { id: 'system-health', label: 'System Health', path: '/system-health' },
  { id: 'saas-health', label: 'SaaS Health Center', path: '/saas-health' },
  { id: 'tools-overview', label: 'Tools Overview', path: '/tools' },
];

const VIEWPORTS = [
  { id: '375x812', width: 375, height: 812, tier: 'phone' },
  { id: '768x1024', width: 768, height: 1024, tier: 'tablet' },
  { id: '1024x768', width: 1024, height: 768, tier: 'tablet-landscape' },
  { id: '1280x720', width: 1280, height: 720, tier: 'desktop' },
  { id: '1440x900', width: 1440, height: 900, tier: 'desktop' },
  { id: '1920x1080', width: 1920, height: 1080, tier: 'wide' },
];

const MAX_CAPTURE_ATTEMPTS = Number(process.env.DASHBOARD_RESIZE_RETRIES || 3);
const RETRY_DELAY_MS = Number(process.env.DASHBOARD_RESIZE_RETRY_DELAY_MS || 1500);

function slug(targetId, viewportId) {
  return `${targetId}--${viewportId}`;
}

function isRetryableCaptureError(message) {
  return /timeout|timed out|waiting for|target closed|navigation/i.test(message);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureOne(page, target, viewport) {
  const fileName = `${slug(target.id, viewport.id)}.png`;
  const screenshotPath = join(outputDir, fileName);
  const startedAt = new Date().toISOString();

  try {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const url = new URL(target.path, baseUrl).toString();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await waitForAppReady(page);
    await page.locator('.cd-page-shell, .emergency-route-page, .emergency-whiteboard-page, h1').first().waitFor({ timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(400);
    await dismissOverlays(page);

    const overflow = await measurePageOverflow(page);
    const heading = await page.locator('h1').first().textContent({ timeout: 5_000 }).catch(() => '');
    const shellMetrics = await page.evaluate(() => {
      const shell = document.querySelector('.app-shell-main-content');
      const pageShell = document.querySelector('.cd-page-shell, .emergency-route-page, .cdl-operational-page');
      const mainRect = shell?.getBoundingClientRect();
      const pageRect = pageShell?.getBoundingClientRect();
      return {
        docClientWidth: document.documentElement.clientWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        shellPaddingInline: shell ? getComputedStyle(shell).paddingInline : null,
        shellWidth: mainRect ? Math.round(mainRect.width) : null,
        pageWidth: pageRect ? Math.round(pageRect.width) : null,
        pageLeft: pageRect ? Math.round(pageRect.left) : null,
      };
    });

    await page.screenshot({ path: screenshotPath, fullPage: true });

    return {
      ...target,
      viewport,
      ok: true,
      startedAt,
      finalUrl: page.url(),
      heading: heading?.trim() || '',
      screenshotPath: relative(root, screenshotPath).replaceAll('\\', '/'),
      overflow,
      shellMetrics,
      error: '',
    };
  } catch (error) {
    return {
      ...target,
      viewport,
      ok: false,
      startedAt,
      finalUrl: page.url(),
      heading: '',
      screenshotPath: '',
      overflow: null,
      shellMetrics: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
await seedQaAuth(page);
await installQaNetworkStubs(page);

const results = [];
for (const target of DASHBOARD_TARGETS) {
  for (const viewport of VIEWPORTS) {
    console.log(`Capturing ${target.id} @ ${viewport.id}`);
    let result = await captureOne(page, target, viewport);
    let attempt = 1;

    while (!result.ok && attempt < MAX_CAPTURE_ATTEMPTS && isRetryableCaptureError(result.error)) {
      attempt += 1;
      console.warn(
        `Retry ${attempt}/${MAX_CAPTURE_ATTEMPTS} for ${target.id} @ ${viewport.id}: ${result.error}`,
      );
      await sleep(RETRY_DELAY_MS);
      await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => {});
      result = await captureOne(page, target, viewport);
    }

    if (!result.ok) {
      console.error(`Capture failed for ${target.id} @ ${viewport.id}: ${result.error}`);
    }

    results.push(result);
  }
}

await browser.close();

const overflowFailures = results.filter((r) => r.ok && r.overflow && !r.overflow.pass);
const captureFailures = results.filter((r) => !r.ok);

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir: relative(root, outputDir).replaceAll('\\', '/'),
  viewports: VIEWPORTS,
  targets: DASHBOARD_TARGETS,
  total: results.length,
  captured: results.filter((r) => r.ok).length,
  captureFailed: captureFailures.length,
  overflowFailed: overflowFailures.length,
  results,
  overflowSummary: overflowFailures.map((r) => ({
    target: r.id,
    viewport: r.viewport.id,
    docOverflowPx: r.overflow?.docOverflowPx,
    offenders: r.overflow?.offenders,
    shellMetrics: r.shellMetrics,
    screenshotPath: r.screenshotPath,
  })),
};

const reportPath = join(outputDir, 'dashboard-resize-report.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${relative(root, reportPath).replaceAll('\\', '/')}`);
console.log(`Overflow issues: ${overflowFailures.length} / ${results.length}`);

if (captureFailures.length > 0) process.exitCode = 1;