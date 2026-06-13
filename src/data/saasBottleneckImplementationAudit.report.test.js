import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  AUDIT_STATUSES,
  buildSaasBottleneckImplementationAudit,
  formatSaasBottleneckImplementationAuditMarkdown,
} from './saasBottleneckImplementationAudit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const docsDir = join(repoRoot, 'docs');

describe('saasBottleneckImplementationAudit report', () => {
  it('builds implementation checks for every architecture phase', () => {
    const audit = buildSaasBottleneckImplementationAudit();

    expect(audit.checks.length).toBeGreaterThanOrEqual(10);
    expect(audit.summary.total).toBe(audit.checks.length);
    expect(audit.summary.score).toBeGreaterThan(0);
    expect(audit.checks.some((row) => row.category === 'Phase 1')).toBe(true);
    expect(audit.checks.some((row) => row.category === 'Phase 5')).toBe(true);
    expect(audit.checks.some((row) => row.status === AUDIT_STATUSES.PARTIAL)).toBe(true);
  });

  it('formats markdown with status and regeneration instructions', () => {
    const markdown = formatSaasBottleneckImplementationAuditMarkdown();

    expect(markdown).toContain('# SaaS Bottleneck Implementation Audit');
    expect(markdown).toContain('npm run saas-bottleneck-audit:write-docs');
    expect(markdown).toContain('## Checks');
  });

  it('writes docs/saas-bottleneck-implementation-audit.md when requested', () => {
    if (!process.env.SAAS_BOTTLENECK_AUDIT_WRITE_DOCS) return;

    const audit = buildSaasBottleneckImplementationAudit();
    const markdown = formatSaasBottleneckImplementationAuditMarkdown(audit);
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'saas-bottleneck-implementation-audit.md'), `${markdown}\n`);
    expect(existsSync(join(docsDir, 'saas-bottleneck-implementation-audit.md'))).toBe(true);
  });
});

