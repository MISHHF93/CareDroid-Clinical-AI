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
      ['Assistant', '/assistant'],
      ['Tools', '/tools'],
      ['Operations', '/operations'],
      ['Profile', '/profile'],
      ['Settings', '/settings'],
    ]);
  });

  it('keeps operations destinations in their own sidebar section', () => {
    expect(OPERATIONS_SIDEBAR_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual([
      ['Digital Twin', '/digital-twin'],
      ['Hospital Map', '/hospital-map'],
      ['Medical IoT', '/medical-iot'],
      ['Devices', '/devices'],
      ['Fleet Map', '/fleet/map'],
      ['Live Map', '/live-map'],
    ]);
  });

  it('keeps developer and governance routes in the collapsed advanced group', () => {
    expect(ADVANCED_SIDEBAR_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual([
      ['Developer Catalog', '/tools/catalog'],
      ['System Health', '/system-health'],
      ['Governance', '/ai-governance'],
      ['Security', '/security'],
      ['Audit', '/audit'],
      ['Regulatory', '/regulatory'],
      ['Assets', '/assets'],
    ]);
  });

  it('does not duplicate visible sidebar destinations', () => {
    const paths = [...PRIMARY_SIDEBAR_NAV_ITEMS, ...OPERATIONS_SIDEBAR_NAV_ITEMS, ...ADVANCED_SIDEBAR_NAV_ITEMS].map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('does not activate multiple visible sidebar items for known nav paths', () => {
    const visibleItems = [
      ...PRIMARY_SIDEBAR_NAV_ITEMS,
      ...OPERATIONS_SIDEBAR_NAV_ITEMS,
      ...ADVANCED_SIDEBAR_NAV_ITEMS,
    ];
    const paths = new Set(
      visibleItems.flatMap((item) => [
        item.path,
        ...(item.matchPaths || []),
        ...(item.legacyPaths || []),
      ]).filter(Boolean)
    );

    for (const path of paths) {
      const matches = visibleItems.filter((item) => primaryNavPathMatches(item, path));

      expect(matches.map((item) => item.id), path).toHaveLength(1);
    }
  });

  it('keeps mobile navigation compact and canonical', () => {
    expect(PRIMARY_MOBILE_NAV_ITEMS.map((item) => item.path)).toEqual([
      '/dashboard',
      '/assistant',
      '/tools',
      '/operations',
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

  it('keeps operations routes discoverable under their matching operations item', () => {
    expect(getPrimaryNavItemForPath('/live-map')?.id).toBe('live-map');
    expect(getPrimaryNavItemForPath('/maps')?.id).toBe('live-map');
    expect(getPrimaryNavItemForPath('/hospital-map')?.id).toBe('hospital-map');
    expect(getPrimaryNavItemForPath('/medical-iot')?.id).toBe('medical-iot');
    expect(getPrimaryNavItemForPath('/devices')?.id).toBe('devices');
    expect(getPrimaryNavItemForPath('/fleet/map')?.id).toBe('fleet');
    expect(getPrimaryNavItemForPath('/digital-twin')?.id).toBe('digital-twin');
    expect(getPrimaryNavItemForPath('/operations')?.id).toBe('operations');
  });

  it('activates exactly one primary nav item for profile and settings routes', () => {
    const expected = [
      ['/profile', 'profile'],
      ['/profile/activity', 'profile'],
      ['/profile/tool-preferences', 'profile'],
      ['/profile/settings', 'settings'],
      ['/profile/preferences', 'settings'],
      ['/settings', 'settings'],
    ];

    for (const [path, itemId] of expected) {
      const matches = PRIMARY_SIDEBAR_NAV_ITEMS.filter((item) => primaryNavPathMatches(item, path));

      expect(matches.map((item) => item.id), path).toEqual([itemId]);
      expect(getPrimaryNavItemForPath(path)?.id, path).toBe(itemId);
    }
  });
});
