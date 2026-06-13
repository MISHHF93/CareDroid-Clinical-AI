/**
 * Regenerates docs/tool-render-execute-*.md when TOOL_MATRIX_WRITE_DOCS=1.
 *
 * Usage: npm run tool-matrix:write-docs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  formatRenderExecuteMarkdown,
  runRenderExecuteValidation,
} from './toolRenderExecuteMatrix';
import { formatManualQaMarkdown } from './e2eManualQaChecklist';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '../../docs');

describe('toolRenderExecuteMatrix report', () => {
  it('matrix validation passes', () => {
    const validation = runRenderExecuteValidation();
    expect(validation.ok, JSON.stringify(validation.findings?.filter((f) => f.issues?.length), null, 2)).toBe(true);
  });

  it('writes markdown docs when TOOL_MATRIX_WRITE_DOCS is set', () => {
    if (!process.env.TOOL_MATRIX_WRITE_DOCS) return;

    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'tool-render-execute-matrix.md'), `${formatRenderExecuteMarkdown()}\n`);
    writeFileSync(join(docsDir, 'tool-render-execute-manual-qa.md'), `${formatManualQaMarkdown()}\n`);
  });
});
