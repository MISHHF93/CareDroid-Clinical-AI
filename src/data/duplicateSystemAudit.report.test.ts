import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  buildDuplicateSystemReport,
  formatDuplicateSystemAuditMarkdown,
  DUPLICATE_AUDIT_SECTIONS,
} from './duplicateSystemAudit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const docsDir = join(repoRoot, 'docs');

describe('duplicateSystemAudit report', () => {
  it('documents duplicate sections for all required domains', () => {
    const ids = DUPLICATE_AUDIT_SECTIONS.map((s) => s.id);
    expect(ids).toContain('routes');
    expect(ids).toContain('layouts');
    expect(ids).toContain('sidebars');
    expect(ids).toContain('navigation');
    expect(ids).toContain('inventories');
    expect(ids).toContain('calculators');
    expect(ids).toContain('dashboards');
    expect(ids).toContain('auth-configs');
    expect(ids).toContain('workspace-configs');
    expect(ids).toContain('asset-registries');
    expect(ids).toContain('executor-mappings');
  });

  it('writes docs/duplicate-system-audit.md when DUPLICATE_SYSTEM_AUDIT_WRITE_DOCS=1', () => {
    if (!process.env.DUPLICATE_SYSTEM_AUDIT_WRITE_DOCS) return;

    const markdown = formatDuplicateSystemAuditMarkdown();
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'duplicate-system-audit.md'), `${markdown}\n`);
    expect(existsSync(join(docsDir, 'duplicate-system-audit.md'))).toBe(true);
  });
});
