#!/usr/bin/env node
/**
 * CI safety gate for CareDroid AI evaluation.
 *
 * Runs the offline harness (unless --skip-run) and fails if any blocking
 * gate or blocking case failed.
 *
 * Usage:
 *   node scripts/ai-eval-gate.mjs
 *   node scripts/ai-eval-gate.mjs --skip-run   # use existing qa/ai-eval/results/latest.json
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skipRun = process.argv.includes('--skip-run');
const latestPath = join(rootDir, 'qa', 'ai-eval', 'results', 'latest.json');

if (!skipRun) {
  const run = spawnSync(process.execPath, [join(rootDir, 'scripts', 'ai-eval-run.mjs')], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  // Still read report; exit code handled after inspection for clearer CI logs
  if (run.error) {
    console.error(run.error);
    process.exit(1);
  }
}

if (!existsSync(latestPath)) {
  console.error(`[FAIL] Missing ${latestPath} — run node scripts/ai-eval-run.mjs first`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(latestPath, 'utf8'));
const blockingGates = (report.gateResults || []).filter((g) => g.blocking && !g.passed);
const blockingCases = (report.caseResults || []).filter((c) => c.blocking && !c.pass);

console.log('\nCareDroid AI eval CI gate');
console.log(`Suite: ${report.suiteId} @ ${report.evaluatedAt}`);
console.log(`Overall harness flag: ${report.summary?.overallPass ? 'PASS' : 'FAIL'}`);

if (blockingGates.length) {
  console.log('\nBlocking metric failures:');
  for (const g of blockingGates) {
    console.log(`  - ${g.metricId}: ${g.value} ${g.operator} ${g.threshold}`);
  }
}
if (blockingCases.length) {
  console.log('\nBlocking case failures:');
  for (const c of blockingCases.slice(0, 20)) {
    console.log(`  - ${c.packId}/${c.caseId}: ${c.detail}`);
  }
  if (blockingCases.length > 20) {
    console.log(`  … +${blockingCases.length - 20} more`);
  }
}

const pass = blockingGates.length === 0 && blockingCases.length === 0;
if (!pass) {
  console.log('\nGATE FAILED — do not promote model/prompt/RAG candidate.');
  process.exit(1);
}

console.log('\nGATE PASSED — offline safety suite green.');
process.exit(0);
