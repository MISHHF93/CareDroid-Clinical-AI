#!/usr/bin/env node
/**
 * Shell UX responsive screenshots — key ED routes at phone → 34" ultrawide.
 * Writes full-page PNGs plus 1280px-wide viewport previews for review.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dismissOverlays, installQaNetworkStubs, seedQaAuth } from '../e2e/responsive-qa.helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const baseUrl = process.env.QA_BASE_URL || 'http://localhost:4173';
const outputDir = process.env.SHELL_RESPONSIVE_DIR || join(root, 'qa', 'shell-ux-audit', 'responsive');
const previewDir = join(outputDir, 'previews');

const TARGETS = [
  { id: 'whiteboard', label: 'Whiteboard', path: '/emergency/whiteboard' },
  { id: 'command-center', label: 'Command Center', path: '/emergency/command-center' },
  { id: 'ems', label: 'EMS', path: '/emergency/ems' },
  { id: 'reception', label: 'Reception', path: '/emergency/reception' },
  { id: 'copilot', label: 'Copilot', path: '/emergency/copilot' },
  { id: 'tools', label: 'Tools', path: '/tools' },
];

const VIEWPORTS = [
  { id: '390x844', width: 390, height: 844, tier: 'phone', preview: true },
  { id: '768x1024', width: 768, height: 1024, tier: 'tablet', preview: true },
  { id: '1440x900', width: 1440, height: 900, tier: 'laptop', preview: true },
  { id: '1920x1080', width: 1920, height: 1080, tier: 'desktop', preview: true },
  { id: '2560x1440', width: 2560, height: 1440, tier: 'qhd-34', preview: true },
  { id: '3440x1440', width: 3440, height: 1440, tier: 'ultrawide-34', preview: true },
];

const PREVIEW_VIEWPORT = { width: 1280, height: 720 };

function slug(targetId, viewportId) {
  return `${targetId}--${viewportId}`;
}

function relativePath(path) {
  return relative(root, path).replaceAll('\\', '/');
}

async function waitForRenderablePage(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 45_000 });
  await page
    .locator('.emergency-app-shell, .app-shell-main-content, .shell-route-tab, h1')
    .first()
    .waitFor({ timeout: 45_000 });
  await page.waitForTimeout(Number(process.env.SHELL_SCREENSHOT_STABILIZE_MS || 600));
}

async function captureTarget(page, target, viewport) {
  const fileName = `${slug(target.id, viewport.id)}.png`;
  const screenshotPath = join(outputDir, fileName);
  const previewPath = join(previewDir, `${slug(target.id, viewport.id)}--preview.png`);
  const startedAt = new Date().toISOString();

  try {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(new URL(target.path, baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await waitForRenderablePage(page);
    await dismissOverlays(page);

    const layoutMetrics = await page.evaluate(() => {
      const shell = document.querySelector('.app-shell-main-content');
      const pageRoot = document.querySelector(
        '.cd-page-shell, .emergency-route-page, .emergency-whiteboard-page, .reception-workspace',
      );
      const shellRect = shell?.getBoundingClientRect();
      const pageRect = pageRoot?.getBoundingClientRect();
      const styles = shell ? getComputedStyle(shell) : null;
      return {
        docClientWidth: document.documentElement.clientWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        shellWidth: shellRect ? Math.round(shellRect.width) : null,
        shellLeft: shellRect ? Math.round(shellRect.left) : null,
        pageWidth: pageRect ? Math.round(pageRect.width) : null,
        pageLeft: pageRect ? Math.round(pageRect.left) : null,
        pageMaxWidth: pageRoot ? getComputedStyle(pageRoot).maxWidth : null,
        shellPaddingInline: styles?.paddingInline ?? null,
      };
    });

    const heading = await page.locator('h1').first().textContent({ timeout: 5_000 }).catch(() => '');
    const useFullPage = viewport.width <= 1920;
    await page.screenshot({ path: screenshotPath, fullPage: useFullPage });

    let previewPathRel = '';
    if (viewport.preview) {
      await page.setViewportSize(PREVIEW_VIEWPORT);
      await page.waitForTimeout(200);
      await page.screenshot({ path: previewPath, fullPage: false });
      previewPathRel = relativePath(previewPath);
    }

    return {
      ...target,
      viewport,
      ok: true,
      startedAt,
      finalUrl: page.url(),
      heading: heading?.trim() || '',
      screenshotPath: relativePath(screenshotPath),
      previewPath: previewPathRel,
      layoutMetrics,
      docOverflowPx: Math.max(0, layoutMetrics.docScrollWidth - layoutMetrics.docClientWidth),
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
      previewPath: '',
      layoutMetrics: null,
      docOverflowPx: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

mkdirSync(outputDir, { recursive: true });
mkdirSync(previewDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
await seedQaAuth(page);
await installQaNetworkStubs(page);

const results = [];
for (const target of TARGETS) {
  for (const viewport of VIEWPORTS) {
    console.log(`Capturing ${target.id} @ ${viewport.id}`);
    const result = await captureTarget(page, target, viewport);
    if (!result.ok) {
      console.error(`  failed: ${result.error}`);
    } else if (result.docOverflowPx > 2) {
      console.warn(`  horizontal overflow: ${result.docOverflowPx}px`);
    }
    results.push(result);
  }
}

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir: relativePath(outputDir),
  previewDir: relativePath(previewDir),
  previewViewport: PREVIEW_VIEWPORT,
  viewports: VIEWPORTS,
  targets: TARGETS,
  total: results.length,
  captured: results.filter((r) => r.ok).length,
  failed: results.filter((r) => !r.ok).length,
  overflowIssues: results.filter((r) => r.ok && (r.docOverflowPx ?? 0) > 2),
  results,
};

const reportPath = join(outputDir, 'shell-responsive-report.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${relativePath(reportPath)}`);
console.log(`Captured ${report.captured}/${report.total}; overflow issues: ${report.overflowIssues.length}`);

if (report.failed > 0) {
  process.exitCode = 1;
}