import { describe, expect, it } from 'vitest';
import {
  OFFLINE_CATALOG_KINDS,
  buildOfflineCatalogSnapshots,
  isOfflineCatalogStale,
  summarizeOfflineCatalogs,
} from './offlineMode';

describe('offlineMode catalog snapshots', () => {
  it('builds cached tools, calculators, simulations, and protocols for offline use', () => {
    const snapshots = buildOfflineCatalogSnapshots(new Date('2026-05-31T00:00:00Z').getTime());
    const kinds = snapshots.map((snapshot) => snapshot.kind);

    expect(kinds).toEqual([
      OFFLINE_CATALOG_KINDS.TOOLS,
      OFFLINE_CATALOG_KINDS.CALCULATORS,
      OFFLINE_CATALOG_KINDS.SIMULATIONS,
      OFFLINE_CATALOG_KINDS.PROTOCOLS,
    ]);
    expect(snapshots.every((snapshot) => snapshot.count > 0)).toBe(true);
    expect(snapshots.every((snapshot) => snapshot.items.every((item) => item.offlineReady))).toBe(
      true,
    );
  });

  it('labels stale catalogs and summarizes offline readiness', () => {
    const now = new Date('2026-05-31T00:00:00Z').getTime();
    const stale = new Date(now - 48 * 60 * 60 * 1000).toISOString();
    const fresh = new Date(now).toISOString();

    expect(isOfflineCatalogStale(stale, now)).toBe(true);
    expect(isOfflineCatalogStale(fresh, now)).toBe(false);

    const summary = summarizeOfflineCatalogs(
      [
        { kind: OFFLINE_CATALOG_KINDS.TOOLS, label: 'Cached tools', count: 2, cachedAt: fresh },
        {
          kind: OFFLINE_CATALOG_KINDS.PROTOCOLS,
          label: 'Cached protocols',
          count: 1,
          cachedAt: stale,
        },
      ],
      now,
    );

    expect(summary.totalItems).toBe(3);
    expect(summary.staleCount).toBeGreaterThan(0);
    expect(summary.readyCount).toBe(2);
  });
});
