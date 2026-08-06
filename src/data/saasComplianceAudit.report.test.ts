import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  buildSaasComplianceRows,
  formatSaasComplianceMarkdown,
  getSaasComplianceDocument,
} from './saasComplianceAudit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const docsDir = join(repoRoot, 'docs', 'operations');

describe('saasComplianceAudit report', () => {
  it('builds compliance rows with violation tracking', () => {
    const rows = buildSaasComplianceRows();
    expect(rows.length).toBeGreaterThan(50);
    expect(rows.filter((r) => r.packAssignment === '—')).toEqual([]);
    expect(rows.filter((r) => r.governance !== 'Complete (seed template)')).toEqual([]);
    expect(rows.some((r) => r.layer === 'ai-agent' && r.packAssignment.includes('ai-workflow-pack'))).toBe(
      true
    );
    expect(rows.some((r) => r.assetId === 'qsofa' && r.packAssignment.includes('emergency-medicine'))).toBe(true);
  });

  it('writes docs/operations/saas-compliance-audit.md when SAAS_COMPLIANCE_WRITE_DOCS=1', () => {
    if (!process.env.SAAS_COMPLIANCE_WRITE_DOCS) return;

    const doc = getSaasComplianceDocument();
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(
      join(docsDir, 'saas-compliance-audit.md'),
      `${formatSaasComplianceMarkdown(doc)}\n`
    );
    expect(existsSync(join(docsDir, 'saas-compliance-audit.md'))).toBe(true);
  });
});
