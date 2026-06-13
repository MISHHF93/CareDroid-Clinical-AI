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
const EMERGENCY_OS_APP_ROUTE_RANGE = Object.freeze({ min: 30, max: 80 });

describe('orphanDetectionAudit report', () => {
  it('builds orphan findings across categories', { timeout: 60_000 }, () => {
    const report = buildOrphanDetectionReport();
    expect(report.summary.total).toBeGreaterThan(0);
    // Emergency OS intentionally retired the broad platform route surface; this
    // count now covers active ED routes plus legacy redirects into the ED shell.
    expect(report.summary.appRouteCount).toBeGreaterThanOrEqual(EMERGENCY_OS_APP_ROUTE_RANGE.min);
    expect(report.summary.appRouteCount).toBeLessThanOrEqual(EMERGENCY_OS_APP_ROUTE_RANGE.max);
    expect(report.all.some((r) => r.classification === ORPHAN_CLASSIFICATIONS.QUARANTINE)).toBe(true);
  });

  it('writes docs/orphan-detection-report.md when ORPHAN_DETECTION_WRITE_DOCS=1', { timeout: 60_000 }, () => {
    if (!process.env.ORPHAN_DETECTION_WRITE_DOCS) return;

    const markdown = formatOrphanDetectionMarkdown();
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'orphan-detection-report.md'), `${markdown}\n`);
    expect(existsSync(join(docsDir, 'orphan-detection-report.md'))).toBe(true);
  });
});
