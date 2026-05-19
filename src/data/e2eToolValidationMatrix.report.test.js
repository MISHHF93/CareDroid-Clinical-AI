/**
 * CLI report runner — inventory matrix + QA checklists (stdout; optional doc write).
 *
 * Usage:
 *   npm run e2e-matrix:report
 *   E2E_MATRIX_WRITE_DOCS=1 npm run e2e-matrix:write-docs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';
import {
  formatE2eMatrixMarkdown,
  getE2eValidationMatrixDocument,
  runMatrixValidation,
} from './e2eToolValidationMatrix';
import { formatManualQaMarkdown } from './e2eManualQaChecklist';
import { formatRegressionMarkdown } from './e2eRegressionChecklist';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const docsDir = join(repoRoot, 'docs');

describe('e2eToolValidationMatrix report', () => {
  it('prints matrix report and fails on validation issues', () => {
    const validation = runMatrixValidation();
    const doc = getE2eValidationMatrixDocument();
    console.log(formatE2eMatrixMarkdown(doc));
    console.log('\n--- Manual QA sections:', 'see docs/e2e-manual-qa-checklist.md ---');
    console.log('--- Regression gates:', 'see docs/e2e-regression-checklist.md ---\n');

    if (!validation.ok) {
      throw new Error(
        `E2E matrix validation failed (${validation.failing} rows): ${JSON.stringify(
          validation.findings.filter((f) => f.issues.length),
          null,
          2
        )}`
      );
    }
  });

  it('writes markdown docs when E2E_MATRIX_WRITE_DOCS is set', () => {
    if (!process.env.E2E_MATRIX_WRITE_DOCS) return;

    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'e2e-tool-validation-matrix.md'), `${formatE2eMatrixMarkdown()}\n`);
    writeFileSync(join(docsDir, 'e2e-manual-qa-checklist.md'), `${formatManualQaMarkdown()}\n`);
    writeFileSync(join(docsDir, 'e2e-regression-checklist.md'), `${formatRegressionMarkdown()}\n`);
    console.log('Wrote docs/e2e-*.md');
  });
});
