#!/usr/bin/env node
/**
 * Runs responsive Playwright matrix and writes qa/RESPONSIVE_QA_REPORT.md summary.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatResponsiveQaMatrixMarkdown,
  countResponsiveQaCells,
  RESPONSIVE_QA_PAGES,
  RESPONSIVE_QA_VIEWPORTS,
  RESPONSIVE_QA_BROWSER_PROJECTS,
} from '../src/data/responsiveQaMatrix.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const qaDir = join(root, 'qa');
const reportJson = join(qaDir, 'playwright-responsive-report.json');
const reportMd = join(qaDir, 'RESPONSIVE_QA_REPORT.md');
const matrixMd = join(qaDir, 'RESPONSIVE_QA_MATRIX.md');

mkdirSync(qaDir, { recursive: true });
writeFileSync(matrixMd, `${formatResponsiveQaMatrixMarkdown()}\n`);

const args = ['playwright', 'test', 'e2e/responsive-qa.spec.mjs', '--config=playwright.config.mjs'];
if (process.env.QA_BROWSERS) {
  args.push(`--project=${process.env.QA_BROWSERS}`);
}

console.log(`Running responsive QA (${countResponsiveQaCells()} matrix cells)…`);
const result = spawnSync('npx', args, { cwd: root, stdio: 'inherit', shell: true });

/** @type {{ failures: object[], passes: number, skipped: number }} */
const summary = { failures: [], passes: 0, skipped: 0, total: 0, pass: false };

if (existsSync(reportJson)) {
  const raw = JSON.parse(readFileSync(reportJson, 'utf8'));
  const suites = raw.suites || [];
  const collect = (suite, file = '') => {
    const f = suite.file || file;
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
          summary.failures.push({ project, title, error: String(err).slice(0, 500) });
        }
      }
    }
    for (const child of suite.suites || []) collect(child, f);
  };
  for (const s of suites) collect(s);
}

summary.pass = summary.failures.length === 0 && result.status === 0;

const lines = [
  '# Responsive QA report',
  '',
  `**Run:** ${new Date().toISOString()}`,
  '',
  '## Summary',
  '',
  `| Metric | Value |`,
  `| --- | --- |`,
  `| Matrix cells | ${countResponsiveQaCells()} |`,
  `| Executed tests | ${summary.total} |`,
  `| Passed | ${summary.passes} |`,
  `| Failed | ${summary.failures.length} |`,
  `| Skipped | ${summary.skipped} |`,
  `| Overall | **${summary.pass ? 'PASS' : 'FAIL'}** |`,
  '',
];

if (summary.failures.length) {
  lines.push('## Failures', '');
  for (const f of summary.failures) {
    lines.push(`### ${f.project} — ${f.title}`, '', '```', f.error, '```', '');
  }
} else if (summary.total === 0) {
  lines.push('_No Playwright JSON results found; check terminal output._', '');
}

lines.push('## Matrix reference', '', `See [RESPONSIVE_QA_MATRIX.md](./RESPONSIVE_QA_MATRIX.md).`, '');

writeFileSync(reportMd, lines.join('\n'));
writeFileSync(
  join(qaDir, 'responsive-qa-summary.json'),
  JSON.stringify(summary, null, 2)
);

process.exit(summary.pass ? 0 : 1);
