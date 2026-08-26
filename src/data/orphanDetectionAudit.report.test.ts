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
// max bumped 320->360: 11 new clinical department dashboard routes (cardiology,
// pharmacy, radiology, education, nephrology, neurology, gastroenterology,
// endocrinology, pediatrics-obgyn, psychiatry, pulmonology) were wired into
// platformConsoleRouteTree.tsx this session, legitimately growing the real
// app route count past the old ceiling -- not a regression. Headroom added
// per this file's own documented pattern rather than tuned to the exact count.
// max bumped 360->420 (2026-08-25): orphanDetectionAudit.ts's parseAppRoutePaths()
// previously didn't recognize IN_SHELL_ROUTE_REDIRECTS/OUTSIDE_SHELL_ROUTE_REDIRECTS/
// ED_CANONICAL_ROUTE_ALIASES/AUTH_PATH_ALIASES/AUTH_SIGNUP_PATH_ALIASES as covering
// real, mounted routes (their <Route path={path}> is a loop variable, invisible to
// the literal-string-match regexes) -- fixing that accuracy gap correctly counts
// ~30 more real routes as covered (appRouteCount 354->368), not a regression either.
const EMERGENCY_OS_APP_ROUTE_RANGE = Object.freeze({ min: 30, max: 420 });

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
