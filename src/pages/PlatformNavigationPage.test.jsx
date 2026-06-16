import { describe, expect, it } from 'vitest';
import { resolvePlatformNavigationDestination } from './PlatformNavigationPage';
import { CANONICAL_ROUTES } from '../config/routes.config';

describe('PlatformNavigationPage route resolver', () => {
  it('keeps mounted platform routes direct', () => {
    expect(
      resolvePlatformNavigationDestination({
        id: 'marketplace',
        label: 'Marketplace',
        path: CANONICAL_ROUTES.marketplace,
      }),
    ).toMatchObject({
      to: CANONICAL_ROUTES.marketplace,
      direct: true,
    });
  });

  it('maps legacy catalog and unmounted routes to active destinations', () => {
    expect(
      resolvePlatformNavigationDestination({
        id: 'developer-audit',
        label: 'Developer Catalog',
        path: CANONICAL_ROUTES.developerCatalog,
      }).to,
    ).toBe('/emergency/tools?source=catalog&filter=all');

    expect(
      resolvePlatformNavigationDestination({
        id: 'governance',
        label: 'Governance',
        path: CANONICAL_ROUTES.emergencyAiGovernance,
      }).to,
    ).toBe(CANONICAL_ROUTES.aiGovernance);
  });

  it('falls back unknown platform routes to Medical Tools with intent', () => {
    expect(
      resolvePlatformNavigationDestination({
        id: 'unknown-future-page',
        label: 'Unknown Future Page',
        path: '/unknown-future-page',
      }),
    ).toMatchObject({
      to: '/emergency/tools?source=platform&filter=all&q=unknown-future-page',
      direct: false,
    });
  });
});
