import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildToolAuditData, formatToolAuditMarkdown } from './toolAuditReport';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('tool audit report', () => {
  it('builds complete registry status artifacts', () => {
    const data = buildToolAuditData();

    expect(data.summary.totalRows).toBeGreaterThanOrEqual(data.summary.registryTools);
    expect(data.tools.length).toBe(data.summary.totalRows);
    expect(data.summary.postExecutors).toBe(3);

    for (const row of data.tools) {
      expect(row.toolId).toBeTruthy();
      expect(row.displayName).toBeTruthy();
      expect(['wired', 'partially wired', 'missing backend', 'broken']).toContain(row.status);
      expect(row.frontend).toBeTruthy();
      expect(row.backend).toBeTruthy();
      expect(row.schemas.input).toBeTruthy();
      expect(row.schemas.output).toBeTruthy();
    }

    if (process.env.TOOL_AUDIT_WRITE === '1') {
      const repoRoot = join(__dirname, '../..');
      writeFileSync(
        join(repoRoot, 'TOOL_REGISTRY_STATUS.json'),
        `${JSON.stringify(data, null, 2)}\n`
      );
      writeFileSync(join(repoRoot, 'TOOL_AUDIT_REPORT.md'), `${formatToolAuditMarkdown(data)}\n`);
    }
  });
});
