import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  buildProductPackagingAudit,
  formatProductPackagingAuditMarkdown,
  PRODUCT_SOLUTION_PACKS,
} from './productPackagingAudit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const docsDir = join(repoRoot, 'docs', 'specs');

describe('productPackagingAudit report', () => {
  it('defines nine solution packs wired to seed ids', () => {
    expect(PRODUCT_SOLUTION_PACKS).toHaveLength(9);
    const audit = buildProductPackagingAudit();
    expect(audit.solutionPackChecks.every((p) => p.packExists)).toBe(true);
    expect(audit.solutionPackChecks.every((p) => p.productLinksPack)).toBe(true);
  });

  it('writes docs/specs/product-packaging-audit.md when PRODUCT_PACKAGING_AUDIT_WRITE_DOCS=1', () => {
    if (!process.env.PRODUCT_PACKAGING_AUDIT_WRITE_DOCS) return;

    const markdown = formatProductPackagingAuditMarkdown();
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'product-packaging-audit.md'), `${markdown}\n`);
    expect(existsSync(join(docsDir, 'product-packaging-audit.md'))).toBe(true);
  });
});
