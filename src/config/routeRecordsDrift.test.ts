/**
 * ROUTE_RECORDS drift guard (HEAL-045 / MB-A3, first mechanical slice).
 *
 * routes.config.ts contains two independently-hand-edited registries:
 * CANONICAL_ROUTE_MAP (the real one driving navigation/authorization) and
 * ROUTE_RECORDS (consumed by audit/documentation tooling). They have drifted
 * bidirectionally before — entries claiming status 'active' whose componentKey
 * exists nowhere in the render layer (misleading every audit tool that trusts
 * them), and entries claiming 'future' for pages that are live in
 * CANONICAL_ROUTE_MAP (tenantAdmin, stale since HEAL-025). Until the two are
 * consolidated, this guard makes both drift directions a test failure.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTE_MAP, ROUTE_RECORDS } from './routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(__dirname, '..');

// The render layer — where a real page/component identifier must appear.
// Deliberately excludes src/config (the registries themselves) and src/data
// (hand-maintained audit mirrors), so a registry can never vouch for itself.
const RENDER_LAYER_DIRS = ['pages', 'components', 'features', 'app', 'routing', 'layouts'];

function collectRenderLayerSources(): string[] {
  const contents: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      const stats = statSync(full);
      if (stats.isDirectory()) {
        walk(full);
      } else if (/\.(tsx|ts|jsx)$/.test(entry) && !/\.test\.|\.spec\./.test(entry)) {
        contents.push(readFileSync(full, 'utf8'));
      }
    }
  };
  for (const dir of RENDER_LAYER_DIRS) {
    walk(join(SRC_ROOT, dir));
  }
  return contents;
}

const HEAVY_SCAN_TIMEOUT_MS = 120_000;

describe('ROUTE_RECORDS drift guard', () => {
  it(
    'every ROUTE_RECORDS entry claiming status "active" with a componentKey names a component that exists in the render layer',
    () => {
      const sources = collectRenderLayerSources();
      expect(sources.length).toBeGreaterThan(100);

      const phantoms = ROUTE_RECORDS.filter(
        (record) =>
          record.status === 'active' &&
          typeof (record as { componentKey?: string }).componentKey === 'string' &&
          !sources.some((content) =>
            content.includes((record as { componentKey?: string }).componentKey as string),
          ),
      ).map((record) => `${record.id} → ${(record as { componentKey?: string }).componentKey}`);

      expect(phantoms, 'ROUTE_RECORDS entries claiming active with nonexistent components (set status to future or remove)').toEqual([]);
    },
    HEAVY_SCAN_TIMEOUT_MS,
  );

  it('no ROUTE_RECORDS entry claims status "future" for a path that is live in CANONICAL_ROUTE_MAP', () => {
    const canonicalPaths = new Set(CANONICAL_ROUTE_MAP.map((route) => route.path));
    const staleFutures = ROUTE_RECORDS.filter(
      (record) => record.status === 'future' && canonicalPaths.has(record.path),
    ).map((record) => `${record.id} (${record.path})`);

    expect(staleFutures, 'ROUTE_RECORDS entries claiming future for live canonical routes (set status to active)').toEqual([]);
  });
});
