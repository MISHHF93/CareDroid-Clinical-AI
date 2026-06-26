import { describe, expect, it } from 'vitest';
import {
  SELF_DIAGNOSTIC_STATUS,
  buildPlatformSelfDiagnostics,
} from './platformSelfDiagnostics';

describe('platformSelfDiagnostics', () => {
  it('builds diagnostics for every requested platform surface with a 0-100 score', () => {
    const diagnostics = buildPlatformSelfDiagnostics();
    const categories = diagnostics.summary.categories.map((item) => item.category);

    expect(diagnostics.healthScore).toBeGreaterThanOrEqual(0);
    expect(diagnostics.healthScore).toBeLessThanOrEqual(100);
    expect(diagnostics.summary.total).toBe(diagnostics.checks.length);
    expect(categories).toEqual([
      'routes',
      'apis',
      'inventory',
      'auth',
      'scrolling',
      'layouts',
      'backend-contracts',
      'executors',
      'assets',
    ]);
    expect(diagnostics.checks.map((item) => item.status)).toContain(SELF_DIAGNOSTIC_STATUS.HEALTHY);
    expect(diagnostics.byStatus.critical).toBeDefined();
    expect(diagnostics.byStatus.warning).toBeDefined();
    expect(diagnostics.byStatus.healthy).toBeDefined();
  });

  it('marks missing backend APIs and contracts as critical', () => {
    const diagnostics = buildPlatformSelfDiagnostics({
      inventoryRecords: [],
      frontendApiCalls: [
        {
          id: 'missing-api',
          method: 'GET',
          path: '/api/missing-diagnostic',
          client: 'diagnostic.test.js',
        },
      ],
      backendRoutes: [],
      dependencyMap: {
        summary: { issues: 1 },
        issues: [
          {
            type: 'broken-dependency',
            severity: 'high',
            detail: 'Missing backend route',
            endpoint: 'GET /api/missing-diagnostic',
          },
        ],
      },
    });

    expect(diagnostics.healthLabel).toBe('Critical');
    expect(diagnostics.byStatus.critical.map((item) => item.id)).toEqual(
      expect.arrayContaining(['apis-frontend-backend-match', 'backend-contracts-broken', 'auth-routes'])
    );
  });
});
