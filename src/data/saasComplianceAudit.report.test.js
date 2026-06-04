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
const docsDir = join(repoRoot, 'docs');

describe('saasComplianceAudit report', () => {
  it('builds compliance rows with violation tracking', () => {
    const rows = buildSaasComplianceRows();
    expect(rows.length).toBeGreaterThan(50);
    const withViolations = rows.filter((r) => r.violations.length > 0);
    expect(withViolations.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.layer === 'ai-agent' && r.violations.some((v) => v.rule === 'asset-in-pack'))).toBe(
      true
    );
  });

  it('writes docs/saas-compliance-audit.md when SAAS_COMPLIANCE_WRITE_DOCS=1', () => {
    if (!process.env.SAAS_COMPLIANCE_WRITE_DOCS) return;

    const doc = getSaasComplianceDocument();
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(
      join(docsDir, 'saas-compliance-audit.md'),
      `${formatSaasComplianceMarkdown(doc)}\n`
    );
    console.log(
      `Wrote docs/saas-compliance-audit.md (${doc.rows.length} rows, ${doc.summary.nonCompliant} with violations)`
    );
    expect(existsSync(join(docsDir, 'saas-compliance-audit.md'))).toBe(true);
  });
});
