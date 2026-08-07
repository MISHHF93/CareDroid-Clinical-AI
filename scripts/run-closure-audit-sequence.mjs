#!/usr/bin/env node
/**
 * Regenerate all source-derived closure audit documents.
 *
 * The original 10-prompt manual checklist this script's comments used to
 * point to (docs/closure-audit-sequence.md, plus its 5 companion manual-
 * audit docs: master-implementation-verification.md, ux-simplification-
 * audit.md, deployment-truth-audit.md, platform-readiness-score.md,
 * final-saas-migration-execution-plan.md) was deleted in commit 819ea9e6
 * and never recreated -- found 2026-08-07, this comment had been pointing
 * at a nonexistent file since then. That whole process is superseded by
 * the 3 actively-maintained scorecards this repo now tracks (Repository
 * Readiness, Source Code Quality, Emergency OS Master), so the reference
 * was removed rather than restored.
 *
 * Usage: npm run closure-audit:write-docs
 */

import { spawnSync } from 'node:child_process';
import { execSync } from 'node:child_process';

const STEPS = [
  ['feature-coverage-matrix:write-docs', 'docs/architecture/feature-coverage-matrix.md'],
  ['saas-compliance-audit:write-docs', 'docs/operations/saas-compliance-audit.md'],
  ['orphan-detection:write-docs', 'docs/orphan-detection-report.md'],
  ['duplicate-system-audit:write-docs', 'docs/duplicate-system-audit.md'],
  ['product-packaging-audit:write-docs', 'docs/specs/product-packaging-audit.md'],
  ['exposure:write-docs', 'docs/backend-exposure-report.md'],
  ['contract:write-docs', 'docs/architecture/backend-frontend-tool-contract.md'],
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
