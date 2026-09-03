#!/usr/bin/env node
/**
 * Re-runs cells listed in qa/RESPONSIVE_QA_FAILURES.json (or full matrix if missing).
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESPONSIVE_QA_BROWSER_PROJECTS } from '../src/data/responsiveQaMatrix.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const failuresPath = join(root, 'qa', 'RESPONSIVE_QA_FAILURES.json');

/** @type {{ title: string, project: string }[]} */
let failures = [];
if (existsSync(failuresPath)) {
  failures = JSON.parse(readFileSync(failuresPath, 'utf8'));
}

if (!failures.length) {
  console.log('No failures file — run npm run qa:responsive first.');
  process.exit(0);
}

const titles = [...new Set(failures.map((f) => f.title))];
const grep = titles.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const projects = [...new Set(failures.map((f) => f.project))];

console.log(`Retrying ${failures.length} cells (${titles.length} unique titles)…`);

let exitCode = 0;
for (const project of projects) {
  const label = RESPONSIVE_QA_BROWSER_PROJECTS.find((b) => b.id === project)?.label || project;
  console.log(`\n=== ${label} ===\n`);
  const env = {
    ...process.env,
    QA_JSON_REPORT: join(root, 'qa', `playwright-responsive-retry-${project}.json`),
    QA_WORKERS: '1',
  };
  const playwrightArgs = [
    'playwright',
    'test',
    'e2e/responsive-qa.spec.mjs',
    '--config=playwright.config.mjs',
    `--project=${project}`,
    '--grep',
    grep,
  ];
  const result =
    process.platform === 'win32'
      ? spawnSync(
          `npx playwright test e2e/responsive-qa.spec.mjs --config=playwright.config.mjs --project=${project} --grep "${grep}"`,
          { cwd: root, stdio: 'inherit', shell: true, env },
        )
      : spawnSync(npx, playwrightArgs, { cwd: root, stdio: 'inherit', shell: false, env });
  if (result.status !== 0) exitCode = 1;
}

process.exit(exitCode);
