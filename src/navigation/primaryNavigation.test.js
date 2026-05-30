import { describe, expect, it } from 'vitest';
import {
  ADVANCED_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  getPrimaryNavItemForPath,
  PRIMARY_MOBILE_NAV_ITEMS,
  PRIMARY_NAV_BY_ID,
  PRIMARY_SIDEBAR_NAV_ITEMS,
  primaryNavPathMatches,
} from './primaryNavigation';

describe('primaryNavigation', () => {
  it('exposes the simplified primary sidebar model in canonical order', () => {
    expect(PRIMARY_SIDEBAR_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual([
      ['Dashboard', '/dashboard'],
      ['AI Assistant', '/assistant'],
      ['Tools', '/tools'],
      ['Profile', '/profile'],
      ['Settings', '/settings'],
    ]);
  });

  it('keeps operations destinations in their own sidebar section', () => {
    expect(OPERATIONS_SIDEBAR_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual([
      ['Digital Twin', '/digital-twin'],
      ['Hospital Map', '/hospital-map'],
      ['Medical IoT', '/medical-iot'],
      ['Fleet', '/fleet/map'],
    ]);
  });

  it('keeps developer and governance routes in the collapsed advanced group', () => {
    expect(ADVANCED_SIDEBAR_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual([
      ['Developer Catalog', '/tools/catalog'],
      ['System Health', '/system-health'],
      ['Governance', '/ai-governance'],
      ['Security', '/security'],
      ['Audit Logs', '/audit-logs'],
    ]);
  });

  it('does not duplicate visible sidebar destinations', () => {
    const paths = [...PRIMARY_SIDEBAR_NAV_ITEMS, ...OPERATIONS_SIDEBAR_NAV_ITEMS, ...ADVANCED_SIDEBAR_NAV_ITEMS].map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('keeps mobile navigation compact and canonical', () => {
    expect(PRIMARY_MOBILE_NAV_ITEMS.map((item) => item.path)).toEqual([
      '/dashboard',
      '/assistant',
      '/tools',
      '/profile',
      '/settings',
    ]);
  });

  it('assigns /tools/catalog to the permissioned Developer Audit entry only', () => {
    expect(getPrimaryNavItemForPath('/tools/catalog')?.id).toBe('developer-audit');
    expect(primaryNavPathMatches(PRIMARY_NAV_BY_ID['developer-audit'], '/tools/catalog')).toBe(true);
    expect(primaryNavPathMatches(PRIMARY_NAV_BY_ID.tools, '/tools/catalog')).toBe(false);
    expect(primaryNavPathMatches(PRIMARY_NAV_BY_ID.settings, '/tools/catalog')).toBe(false);
  });

  it('keeps calculator routes under the Tools nav item without a duplicate sidebar destination', () => {
    expect(ADVANCED_SIDEBAR_NAV_ITEMS.some((item) => item.path === '/tools/calculators')).toBe(false);
    expect(getPrimaryNavItemForPath('/tools/calculators/sofa')?.id).toBe('tools');
  });
});
