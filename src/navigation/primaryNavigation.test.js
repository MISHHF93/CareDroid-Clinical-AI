import { describe, expect, it } from 'vitest';
import { getPrimaryNavItemForPath, PRIMARY_NAV_BY_ID, primaryNavPathMatches } from './primaryNavigation';

describe('primaryNavigation', () => {
  it('assigns /tools/catalog to Tools only', () => {
    expect(getPrimaryNavItemForPath('/tools/catalog')?.id).toBe('tools');
    expect(primaryNavPathMatches(PRIMARY_NAV_BY_ID.tools, '/tools/catalog')).toBe(true);
    expect(primaryNavPathMatches(PRIMARY_NAV_BY_ID.settings, '/tools/catalog')).toBe(false);
  });
});
