#!/usr/bin/env node
/**
 * Run Android device Playwright matrix and write qa/ANDROID_QA_*.md + failures JSON.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatAndroidQaMatrixMarkdown,
  countAndroidQaOverflowCells,
  ANDROID_QA_DEVICES,
  ANDROID_QA_SCENARIOS,
} from '../src/data/androidDeviceQaMatrix.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const qaDir = join(root, 'qa');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

mkdirSync(qaDir, { recursive: true });

const matrixMd = join(qaDir, 'ANDROID_QA_MATRIX.md');
const failuresJson = join(qaDir, 'ANDROID_QA_FAILURES.json');
const fixesMd = join(qaDir, 'ANDROID_QA_FIXES.md');
const reportMd = join(qaDir, 'ANDROID_QA_REPORT.md');
const playwrightJson = join(qaDir, 'playwright-android-report.json');

writeFileSync(matrixMd, `${formatAndroidQaMatrixMarkdown()}\n`);

console.log(
  `Android QA: ${ANDROID_QA_DEVICES.length} devices, ${countAndroidQaOverflowCells()} overflow cells + interaction smoke…`
);

const result = spawnSync(
  npx,
  [
    'playwright',
    'test',
    'e2e/android-device-qa.spec.mjs',
    '--config=playwright.android.config.mjs',
    '--project=chromium-android',
  ],
  { cwd: root, stdio: 'inherit', shell: true, env: { ...process.env } }
);

/** @type {object[]} */
const failures = [];
let passes = 0;
let skipped = 0;
let total = 0;

if (existsSync(playwrightJson)) {
  const raw = JSON.parse(readFileSync(playwrightJson, 'utf8'));
  const collect = (suite) => {
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        total += 1;
        const status = t.results?.[0]?.status || t.status;
        const title = spec.title;
        if (status === 'passed' || status === 'expected') passes += 1;
        else if (status === 'skipped') skipped += 1;
        else {
          const err = String(t.results?.[0]?.error?.message || status).slice(0, 1200);
          const kind = /horizontal overflow/i.test(err)
            ? 'overflow'
            : /timeout/i.test(err)
              ? 'timeout'
              : /touch target/i.test(err)
                ? 'touch'
                : /sidebar|drawer/i.test(err)
                  ? 'sidebar'
                  : /catalog|launch/i.test(err)
                    ? 'catalog'
                    : /calculator|reset/i.test(err)
                      ? 'calculators'
                      : /api tools/i.test(err)
                        ? 'backend'
                        : 'other';
          failures.push({ title, error: err, kind, device: title.match(/\[(.*?)\]/)?.[1] || 'unknown' });
        }
      }
    }
    for (const child of suite.suites || []) collect(child);
  };
  for (const s of raw.suites || []) collect(s);
}

writeFileSync(failuresJson, `${JSON.stringify(failures, null, 2)}\n`);

const fixLines = [
  '# Android QA — recommended fixes',
  '',
  `**Run:** ${new Date().toISOString()}`,
  '',
  failures.length === 0
    ? '_No failures in last run — keep regression gate `npm run test:e2e:android`._'
    : '',
];

if (failures.length > 0) {
  fixLines.push('## Failure list', '', '| Kind | Test |', '| --- | --- |');
  for (const f of failures) {
    fixLines.push(`| ${f.kind} | ${f.title.replace(/\|/g, '\\|')} |`);
  }
  fixLines.push('', '## Suggested fixes', '');
  const byKind = failures.reduce((acc, f) => {
    acc[f.kind] = (acc[f.kind] || 0) + 1;
    return acc;
  }, {});
  if (byKind.overflow) {
    fixLines.push(
      '- **overflow:** Check `catalog-mobile.css`, `Sidebar.css`, `AppShell.css` at failing viewport; add `overflow-wrap`, stacked table rows, or `min-width: 0` on flex children.'
    );
  }
  if (byKind.timeout) {
    fixLines.push('- **timeout:** Warm Vite routes; increase test timeout; verify lazy chunk loads (`.page-loader` clears).');
  }
  if (byKind.touch) {
    fixLines.push('- **touch:** Ensure `--touch-target-min` (44px) on `.app-shell-menu-btn`, `.catalog-category-chip`, `.calc-reset-btn`.');
  }
  if (byKind.sidebar) {
    fixLines.push('- **sidebar:** Verify `sidebar--open` class, backdrop click, `pointer-events: none` when closed.');
  }
  if (byKind.catalog) {
    fixLines.push('- **catalog:** Ensure launch buttons visible at 320–412px (`catalog-mobile.css` stacked rows).');
  }
  if (byKind.calculators) {
    fixLines.push('- **calculators:** Import `calculators-mobile-pr.css`; scroll reset into view.');
  }
  if (byKind.backend) {
    fixLines.push('- **backend:** Stub `/api/tools` in QA; wire `clinicalToolsApi` when catalog mounts.');
  }
}

writeFileSync(fixesMd, `${fixLines.join('\n')}\n`);

const report = [
  '# Android device QA report',
  '',
  `**Date:** ${new Date().toISOString()}`,
  '',
  '| Metric | Value |',
  '| --- | ---: |',
  `| Devices | ${ANDROID_QA_DEVICES.length} |`,
  `| Scenarios | ${ANDROID_QA_SCENARIOS.length} |`,
  `| Tests total | ${total} |`,
  `| Passed | ${passes} |`,
  `| Failed | ${failures.length} |`,
  `| Skipped | ${skipped} |`,
  '',
  failures.length ? '**Status: FAIL** — see `ANDROID_QA_FAILURES.json` and `ANDROID_QA_FIXES.md`.' : '**Status: PASS**',
  '',
  '## Artifacts',
  '',
  '- [ANDROID_QA_MATRIX.md](./ANDROID_QA_MATRIX.md)',
  '- [ANDROID_QA_FAILURES.json](./ANDROID_QA_FAILURES.json)',
  '- [ANDROID_QA_FIXES.md](./ANDROID_QA_FIXES.md)',
  '',
];

writeFileSync(reportMd, `${report.join('\n')}\n`);

console.log(`Wrote ${matrixMd}, ${reportMd}, ${failuresJson}, ${fixesMd}`);
process.exit(result.status ?? 1);
