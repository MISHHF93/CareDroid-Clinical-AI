import { describe, it } from 'vitest';
import { formatPlatformInventoryMarkdown, getPlatformInventory } from './platformInventory';

describe('platformInventory report', () => {
  it('prints platform inventory summary', () => {
    const inv = getPlatformInventory();
    // eslint-disable-next-line no-console -- intentional report output for npm run inventory:report
    console.log('\n--- Platform inventory (source-derived) ---\n');
    console.log(formatPlatformInventoryMarkdown(inv));
    console.log('\n--- Counts JSON ---\n');
    console.log(JSON.stringify(inv.counts, null, 2));
  });
});
