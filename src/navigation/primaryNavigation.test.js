import { describe, expect, it } from 'vitest';
import {
  ADVANCED_SIDEBAR_NAV_ITEMS,
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
      ['Calculators', '/tools/calculators'],
      ['Hospital Map', '/hospital-map'],
      ['Medical IoT', '/medical-iot'],
      ['Fleet Map', '/fleet/map'],
      ['Profile', '/profile'],
      ['Settings', '/settings'],
    ]);
  });

  it('keeps developer and audit routes in the advanced group', () => {
    expect(ADVANCED_SIDEBAR_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual([
      ['Developer Catalog / Source Audit', '/tools/catalog'],
      ['System Health', '/system-health'],
      ['Governance', '/ai-governance'],
      ['Security', '/security'],
      ['Audit Logs', '/audit-logs'],
    ]);
  });

  it('does not duplicate visible sidebar destinations', () => {
    const paths = [...PRIMARY_SIDEBAR_NAV_ITEMS, ...ADVANCED_SIDEBAR_NAV_ITEMS].map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('keeps mobile navigation compact and canonical', () => {
    expect(PRIMARY_MOBILE_NAV_ITEMS.map((item) => item.path)).toEqual([
      '/dashboard',
      '/assistant',
      '/tools',
      '/tools/calculators',
      '/hospital-map',
    ]);
  });

  it('assigns /tools/catalog to the permissioned Developer Audit entry only', () => {
    expect(getPrimaryNavItemForPath('/tools/catalog')?.id).toBe('developer-audit');
    expect(primaryNavPathMatches(PRIMARY_NAV_BY_ID['developer-audit'], '/tools/catalog')).toBe(true);
    expect(primaryNavPathMatches(PRIMARY_NAV_BY_ID.tools, '/tools/catalog')).toBe(false);
    expect(primaryNavPathMatches(PRIMARY_NAV_BY_ID.settings, '/tools/catalog')).toBe(false);
  });
});
