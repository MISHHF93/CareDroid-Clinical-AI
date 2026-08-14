/**
 * App Navigator catalog drift guard (HEAL-202).
 *
 * backend/src/modules/app-navigator/data/catalog.json is a GENERATED
 * snapshot of CANONICAL_ROUTE_MAP (routes.config.ts), produced by
 * `npm run navigator-catalog:sync` (scripts/sync-app-navigator-catalog.mjs).
 * That sync is manual only -- not wired to any build/CI/pretest hook -- so
 * every canonical label/breadcrumb/component change since the last manual
 * run silently drifts out of what App Navigator search results actually
 * show. Found stale by over a week (generatedAt 2026-08-06, missing every
 * label fixed in the same session's HEAL-197/HEAL-199 rounds -- a phantom
 * `TriageWorkspaceRoute` component name, "Reassess"/"Pulse"/"Calls"/
 * "Readiness"/"Queue"/"Alerts" instead of their corrected labels/breadcrumbs)
 * before this guard existed. This test fails the moment the two disagree
 * again, so the fix is always "run the sync script," not "investigate what
 * broke."
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTE_MAP } from './routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const catalogPath = join(
  repoRoot,
  'backend/src/modules/app-navigator/data/catalog.json',
);

type CatalogRecord = {
  id: string;
  label: string;
  path: string;
  component?: string;
  breadcrumbs: string[];
};

describe('App Navigator catalog drift guard', () => {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as {
    records: CatalogRecord[];
  };
  const catalogById = new Map(catalog.records.map((record) => [record.id, record]));

  it('every CANONICAL_ROUTE_MAP entry has a matching catalog.json record', () => {
    const missing = CANONICAL_ROUTE_MAP.filter((route) => !catalogById.has(route.id)).map(
      (route) => route.id,
    );
    expect(missing, 'routes missing from catalog.json (run `npm run navigator-catalog:sync`)').toEqual(
      [],
    );
  });

  it('no catalog.json record survives for a route removed from CANONICAL_ROUTE_MAP', () => {
    const canonicalIds = new Set(CANONICAL_ROUTE_MAP.map((route) => route.id));
    const orphaned = catalog.records
      .filter((record) => !canonicalIds.has(record.id))
      .map((record) => record.id);
    expect(orphaned, 'catalog.json records for routes no longer in CANONICAL_ROUTE_MAP (run the sync script)').toEqual(
      [],
    );
  });

  it.each(CANONICAL_ROUTE_MAP.map((route) => [route.id, route] as const))(
    '%s: label, path, component, and breadcrumbs match CANONICAL_ROUTE_MAP',
    (id, route) => {
      const record = catalogById.get(id);
      expect(record, `catalog.json is missing '${id}' -- run npm run navigator-catalog:sync`).toBeTruthy();
      if (!record) return;
      expect(record.label).toBe(route.label);
      expect(record.path).toBe(route.path);
      expect(record.component).toBe(route.pageComponent || (route as { componentKey?: string }).componentKey);
      expect(record.breadcrumbs).toEqual(route.breadcrumbs || []);
    },
  );
});
