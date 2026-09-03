#!/usr/bin/env node
/**
 * Runs responsive Playwright matrix and writes qa/RESPONSIVE_QA_REPORT.md summary.
 * Browsers run sequentially to avoid overloading the Vite dev server.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatResponsiveQaMatrixMarkdown,
  countResponsiveQaCells,
  RESPONSIVE_QA_BROWSER_PROJECTS,
} from '../src/data/responsiveQaMatrix.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const qaDir = join(root, 'qa');
const reportMd = join(qaDir, 'RESPONSIVE_QA_REPORT.md');
const matrixMd = join(qaDir, 'RESPONSIVE_QA_MATRIX.md');
const fixesMd = join(qaDir, 'RESPONSIVE_QA_FIXES.md');
const mergedJson = join(qaDir, 'playwright-responsive-report.json');

mkdirSync(qaDir, { recursive: true });
writeFileSync(matrixMd, `${formatResponsiveQaMatrixMarkdown()}\n`);

const projects = process.env.QA_BROWSERS
  ? process.env.QA_BROWSERS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : RESPONSIVE_QA_BROWSER_PROJECTS.map((b) => b.id);

/**
 * @param {object} raw
 * @param {{ failures: object[], passes: number, skipped: number, total: number }} summary
 */
function collectFromReport(raw, summary) {
  const suites = raw.suites || [];
  const collect = (suite) => {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        summary.total += 1;
        const status = test.results?.[0]?.status || test.status;
        const title = spec.title;
        const project = test.projectName || 'unknown';
        if (status === 'passed' || status === 'expected') {
          summary.passes += 1;
        } else if (status === 'skipped') {
          summary.skipped += 1;
        } else {
          const err = test.results?.[0]?.error?.message || status;
          const message = String(err).slice(0, 800);
          const kind = /horizontal overflow/i.test(message)
            ? 'overflow'
            : /timeout/i.test(message)
              ? 'timeout'
              : 'other';
          summary.failures.push({ project, title, error: message, kind });
          if (kind === 'overflow') summary.overflowFailures = (summary.overflowFailures || 0) + 1;
        }
      }
    }
    for (const child of suite.suites || []) collect(child);
  };
  for (const s of suites) collect(s);
}

/** @type {{ failures: object[], passes: number, skipped: number, total: number, pass: boolean, browsers: object[] }} */
const summary = {
  failures: [],
  passes: 0,
  skipped: 0,
  total: 0,
  pass: false,
  browsers: [],
  overflowFailures: 0,
};

console.log(
  `Running responsive QA (${countResponsiveQaCells()} matrix cells across ${projects.join(', ')})…`,
);

let exitCode = 0;

for (const project of projects) {
  const perBrowserJson = join(qaDir, `playwright-responsive-${project}.json`);
  const label = RESPONSIVE_QA_BROWSER_PROJECTS.find((b) => b.id === project)?.label || project;

  console.log(`\n=== ${label} (${project}) ===\n`);

  const env = {
    ...process.env,
    QA_JSON_REPORT: perBrowserJson,
    QA_WORKERS: process.env.QA_WORKERS || '2',
    QA_RETRIES: process.env.QA_RETRIES ?? '1',
  };
  const playwrightArgs = [
    'playwright',
    'test',
    'e2e/responsive-qa.spec.mjs',
    '--config=playwright.config.mjs',
    `--project=${project}`,
  ];
  const result =
    process.platform === 'win32'
      ? spawnSync(`npx ${playwrightArgs.join(' ')}`, {
          cwd: root,
          stdio: 'inherit',
          shell: true,
          env,
        })
      : spawnSync(npx, playwrightArgs, { cwd: root, stdio: 'inherit', shell: false, env });

  /** @type {{ project: string, label: string, passes: number, failures: number, skipped: number, total: number, ok: boolean }} */
  const browserSummary = {
    project,
    label,
    passes: 0,
    failures: 0,
    skipped: 0,
    total: 0,
    ok: result.status === 0,
  };

  if (existsSync(perBrowserJson)) {
    const beforeTotal = summary.total;
    const beforePass = summary.passes;
    const beforeFail = summary.failures.length;
    collectFromReport(JSON.parse(readFileSync(perBrowserJson, 'utf8')), summary);
    browserSummary.total = summary.total - beforeTotal;
    browserSummary.passes = summary.passes - beforePass;
    browserSummary.failures = summary.failures.length - beforeFail;
    browserSummary.skipped = browserSummary.total - browserSummary.passes - browserSummary.failures;
  } else {
    console.warn(`Warning: missing ${perBrowserJson}`);
    browserSummary.ok = false;
  }

  summary.browsers.push(browserSummary);
  if (!browserSummary.ok) exitCode = 1;
}

writeFileSync(
  mergedJson,
  `${JSON.stringify({ summary, generatedAt: new Date().toISOString() }, null, 2)}\n`,
);

summary.layoutPass = (summary.overflowFailures || 0) === 0;
summary.pass = summary.failures.length === 0 && exitCode === 0;

const lines = [
  '# Responsive QA report',
  '',
  `**Run:** ${new Date().toISOString()}`,
  '',
  '## Summary',
  '',
  '| Metric | Value |',
  '| --- | --- |',
  `| Matrix cells (expected) | ${countResponsiveQaCells()} |`,
  `| Executed tests | ${summary.total} |`,
  `| Passed | ${summary.passes} |`,
  `| Failed | ${summary.failures.length} |`,
  `| Skipped | ${summary.skipped} |`,
  `| Horizontal overflow failures | ${summary.overflowFailures || 0} |`,
  `| Layout (no page-level overflow) | **${summary.layoutPass ? 'PASS' : 'FAIL'}** |`,
  `| Overall | **${summary.pass ? 'PASS' : 'FAIL'}** |`,
  '',
  '### By browser',
  '',
  '| Browser | Passed | Failed | Total | Status |',
  '| --- | ---: | ---: | ---: | --- |',
  ...summary.browsers.map(
    (b) =>
      `| ${b.label} | ${b.passes} | ${b.failures} | ${b.total} | ${b.ok && b.failures === 0 ? 'PASS' : 'FAIL'} |`,
  ),
  '',
];

if (summary.failures.length) {
  lines.push('## Failures', '');
  const seen = new Set();
  const unique = [];
  for (const f of summary.failures) {
    const key = `${f.project}::${f.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(f);
  }
  summary.uniqueFailures = unique.length;
  for (const f of unique) {
    lines.push(`### ${f.project} — ${f.title}`, '', '```', f.error, '```', '');
  }
  writeFileSync(join(qaDir, 'RESPONSIVE_QA_FAILURES.json'), `${JSON.stringify(unique, null, 2)}\n`);
} else if (summary.total === 0) {
  lines.push('_No Playwright JSON results found; check terminal output._', '');
}

if (existsSync(fixesMd)) {
  lines.push('## Fixes applied', '', readFileSync(fixesMd, 'utf8'), '');
}

lines.push(
  '## Matrix reference',
  '',
  `See [RESPONSIVE_QA_MATRIX.md](./RESPONSIVE_QA_MATRIX.md).`,
  '',
);

writeFileSync(reportMd, lines.join('\n'));
writeFileSync(join(qaDir, 'responsive-qa-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

process.exit(summary.pass ? 0 : 1);
