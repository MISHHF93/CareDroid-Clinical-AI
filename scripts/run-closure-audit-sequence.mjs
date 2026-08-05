#!/usr/bin/env node
/**
 * Regenerate all source-derived closure audit documents (Prompts 2–6).
 * Manual audits (1, 7–10) are listed in docs/closure-audit-sequence.md.
 *
 * Usage: npm run closure-audit:write-docs
 */

import { spawnSync } from 'node:child_process';
import { execSync } from 'node:child_process';

const STEPS = [
  ['feature-coverage-matrix:write-docs', 'docs/architecture/feature-coverage-matrix.md'],
  ['saas-compliance-audit:write-docs', 'docs/saas-compliance-audit.md'],
  ['orphan-detection:write-docs', 'docs/orphan-detection-report.md'],
  ['duplicate-system-audit:write-docs', 'docs/duplicate-system-audit.md'],
  ['product-packaging-audit:write-docs', 'docs/product-packaging-audit.md'],
  ['exposure:write-docs', 'docs/backend-exposure-report.md'],
  ['contract:write-docs', 'docs/backend-frontend-tool-contract.md'],
];

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

console.log(`Closure audit regeneration @ ${gitSha()}\n`);

let failed = 0;
for (const [script, artifact] of STEPS) {
  console.log(`→ npm run ${script}`);
  const result = spawnSync('npm', ['run', script], { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    failed += 1;
    console.error(`FAILED: ${script}`);
  } else {
    console.log(`OK: ${artifact}\n`);
  }
}

if (failed) {
  console.error(`${failed} step(s) failed.`);
  process.exit(1);
}

console.log('Regenerable closure audits complete.');
console.log('Next: review docs/closure-audit-sequence.md checklist (Prompts 1, 7–10).');
