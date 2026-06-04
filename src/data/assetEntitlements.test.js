import { describe, expect, it } from 'vitest';
import {
  filterToolsByEntitlements,
  isAssetEntitled,
  setPlatformEntitlementContext,
} from './assetEntitlements';

describe('assetEntitlements', () => {
  it('filters tools by entitled asset ids when org context is set', () => {
    setPlatformEntitlementContext({
      organization: { id: 'org-1' },
      entitledAssetIds: ['qsofa', 'news2'],
    });
    const tools = [
      { id: 'qsofa', name: 'qSOFA' },
      { id: 'sofa-score', name: 'SOFA' },
      { id: 'news2', name: 'NEWS2' },
    ];
    const filtered = filterToolsByEntitlements(tools);
    expect(filtered.map((t) => t.id)).toEqual(['qsofa', 'news2']);
    setPlatformEntitlementContext(null);
  });

  it('isAssetEntitled returns true without org filter', () => {
    setPlatformEntitlementContext(null);
    expect(isAssetEntitled('any-tool')).toBe(true);
  });
});
