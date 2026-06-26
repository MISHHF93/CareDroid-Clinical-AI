import { describe, expect, it } from 'vitest';
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_ITEMS,
  filterMarketplaceItems,
} from './marketplaceCatalog';

describe('marketplaceCatalog', () => {
  it('covers the required marketplace categories', () => {
    expect(MARKETPLACE_CATEGORIES).toEqual([
      'asset-packs',
      'workflows',
      'simulations',
      'protocols',
      'ai-agents',
      'integrations',
    ]);

    for (const category of MARKETPLACE_CATEGORIES) {
      expect(MARKETPLACE_ITEMS.some((item) => item.category === category)).toBe(true);
    }
  });

  it('filters marketplace items by category and query', () => {
    const results = filterMarketplaceItems({ category: 'integrations', query: 'sso' });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'integration-sso',
      category: 'integrations',
    });
  });
});
