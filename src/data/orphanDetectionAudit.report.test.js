import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  buildOrphanDetectionReport,
  formatOrphanDetectionMarkdown,
  ORPHAN_CLASSIFICATIONS,
} from './orphanDetectionAudit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const docsDir = join(repoRoot, 'docs');

describe('orphanDetectionAudit report', () => {
  it('builds orphan findings across categories', { timeout: 60_000 }, () => {
    const report = buildOrphanDetectionReport();
    expect(report.summary.total).toBeGreaterThan(0);
    expect(report.summary.appRouteCount).toBeGreaterThan(50);
    expect(report.all.some((r) => r.classification === ORPHAN_CLASSIFICATIONS.QUARANTINE)).toBe(true);
  });

  it('writes docs/orphan-detection-report.md when ORPHAN_DETECTION_WRITE_DOCS=1', { timeout: 60_000 }, () => {
    if (!process.env.ORPHAN_DETECTION_WRITE_DOCS) return;

    const markdown = formatOrphanDetectionMarkdown();
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'orphan-detection-report.md'), `${markdown}\n`);
    console.log(`Wrote docs/orphan-detection-report.md`);
    expect(existsSync(join(docsDir, 'orphan-detection-report.md'))).toBe(true);
  });
});
