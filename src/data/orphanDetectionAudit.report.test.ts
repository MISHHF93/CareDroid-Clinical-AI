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
const EMERGENCY_OS_APP_ROUTE_RANGE = Object.freeze({ min: 30, max: 320 });

// Each of the 3 tests below re-runs the same corpus-wide scan; 180s was
// enough at some point but each now measures ~300s as the scanned corpus
// (routes/pages/backend modules) has grown -- bumped with headroom rather
// than tuned to the exact current runtime.
describe('orphanDetectionAudit report', () => {
  it('builds orphan findings across categories', { timeout: 480_000 }, () => {
    const report = buildOrphanDetectionReport();
    expect(report.summary.total).toBeGreaterThan(0);
    // CareDroid intentionally retired the broad platform route surface; this
    // count now covers active ED routes plus legacy redirects into the ED shell.
    expect(report.summary.appRouteCount).toBeGreaterThanOrEqual(EMERGENCY_OS_APP_ROUTE_RANGE.min);
    expect(report.summary.appRouteCount).toBeLessThanOrEqual(EMERGENCY_OS_APP_ROUTE_RANGE.max);
    const classified = report.summary.byClass || {};
    const hasOrphanTaxonomy =
      (classified[ORPHAN_CLASSIFICATIONS.WIRE] ?? 0) > 0 ||
      (classified[ORPHAN_CLASSIFICATIONS.LEGACY] ?? 0) > 0 ||
      (classified[ORPHAN_CLASSIFICATIONS.QUARANTINE] ?? 0) > 0;
    expect(hasOrphanTaxonomy).toBe(true);
  });

  it('scans real .tsx/.ts page, component, and service files, not just legacy .jsx/.js (Cycle 153 — was scanning zero files)', { timeout: 480_000 }, () => {
    const report = buildOrphanDetectionReport();
    const allIds = report.all.map((item) => item.id || item.path).filter(Boolean);
    expect(allIds.some((id) => id.endsWith('.tsx'))).toBe(true);
  });

  it('writes docs/orphan-detection-report.md when ORPHAN_DETECTION_WRITE_DOCS=1', { timeout: 480_000 }, () => {
    if (!process.env.ORPHAN_DETECTION_WRITE_DOCS) return;

    const markdown = formatOrphanDetectionMarkdown();
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'orphan-detection-report.md'), `${markdown}\n`);
    expect(existsSync(join(docsDir, 'orphan-detection-report.md'))).toBe(true);
  });
});
