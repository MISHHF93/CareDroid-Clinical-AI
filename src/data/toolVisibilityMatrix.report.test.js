/**
 * CLI report — prints matrix; writes docs when VISIBILITY_MATRIX_WRITE_DOCS=1.
 *
 * Usage:
 *   npm run visibility-matrix:report
 *   npm run visibility-matrix:write-docs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';
import {
  formatToolVisibilityMatrixMarkdown,
  getToolVisibilityMatrixDocument,
} from './toolVisibilityMatrix';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const docsDir = join(repoRoot, 'docs');

describe('toolVisibilityMatrix report', () => {
  it('prints visibility matrix summary', () => {
    const doc = getToolVisibilityMatrixDocument();
    console.log(formatToolVisibilityMatrixMarkdown(doc));
    console.log('\n--- Status counts ---\n', JSON.stringify(doc.summary.statusCounts, null, 2));
  });

  it('writes docs/tool-visibility-matrix.md when VISIBILITY_MATRIX_WRITE_DOCS is set', () => {
    if (!process.env.VISIBILITY_MATRIX_WRITE_DOCS) return;

    mkdirSync(docsDir, { recursive: true });
    writeFileSync(
      join(docsDir, 'tool-visibility-matrix.md'),
      `${formatToolVisibilityMatrixMarkdown()}\n`
    );
    console.log('Wrote docs/tool-visibility-matrix.md');
  });
});
