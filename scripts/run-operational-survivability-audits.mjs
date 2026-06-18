#!/usr/bin/env node
/**
 * Prompts 61–80 operational survivability audit battery.
 * Run: npm run qa:operational-survivability
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const STEPS = [
  'reception-throughput-simulation.mjs',
  'reception-training-audit.mjs',
  'whiteboard-stress-simulation.mjs',
  'shift-handoff-audit.mjs',
  'operational-handoff-discovery.mjs',
  'alert-audit.mjs',
  'operational-search-audit.mjs',
  'command-palette-audit.mjs',
  'empty-state-discovery.mjs',
  'error-recovery-audit.mjs',
  'integration-discovery.mjs',
  'operational-audit-discovery.mjs',
  'data-quality-discovery.mjs',
  'smart-intake-audit.mjs',
  'queue-audit-discovery.mjs',
  'whiteboard-density-audit.mjs',
  'copilot-recommendation-audit.mjs',
  'multi-tenant-readiness-audit.mjs',
  'clinic-onboarding-simulation.mjs',
  'production-readiness-audit.mjs',
  'operational-survivability-kpis.mjs',
];

console.log('Operational survivability audit battery (Prompts 61–80)\n');

let failed = 0;
for (const script of STEPS) {
  const path = join(root, 'scripts', script);
  console.log(`→ node scripts/${script}`);
  const result = spawnSync(process.execPath, [path], { stdio: 'inherit', cwd: root });
  if (result.status !== 0) {
    failed += 1;
    console.error(`FAILED: ${script}`);
  }
}

if (failed) {
  console.error(`\n${failed} audit step(s) failed.`);
  process.exit(1);
}

console.log('\nAll operational survivability audits complete.');
console.log('See qa/*-report.json and qa/operational-survivability-kpis-report.json');
