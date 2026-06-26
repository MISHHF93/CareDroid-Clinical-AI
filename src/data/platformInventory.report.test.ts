import { describe, expect, it } from 'vitest';
import { formatPlatformInventoryMarkdown, getPlatformInventory } from './platformInventory';

describe('platformInventory report', () => {
  it('builds platform inventory summary', () => {
    const inv = getPlatformInventory();

    expect(formatPlatformInventoryMarkdown(inv)).toContain('#');
    expect(inv.counts).toBeTruthy();
  });
});
