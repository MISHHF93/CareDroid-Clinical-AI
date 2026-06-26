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
import { describe, expect, it } from 'vitest';
import {
  formatToolVisibilityMatrixMarkdown,
  getToolVisibilityMatrixDocument,
} from './toolVisibilityMatrix';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const docsDir = join(repoRoot, 'docs');

describe('toolVisibilityMatrix report', () => {
  it('builds visibility matrix summary', () => {
    const doc = getToolVisibilityMatrixDocument();

    expect(formatToolVisibilityMatrixMarkdown(doc)).toContain('# Tool Visibility Matrix');
    expect(doc.summary.statusCounts).toBeTruthy();
  });

  it('writes docs/tool-visibility-matrix.md when VISIBILITY_MATRIX_WRITE_DOCS is set', () => {
    if (!process.env.VISIBILITY_MATRIX_WRITE_DOCS) return;

    mkdirSync(docsDir, { recursive: true });
    writeFileSync(
      join(docsDir, 'tool-visibility-matrix.md'),
      `${formatToolVisibilityMatrixMarkdown()}\n`
    );
  });
});
