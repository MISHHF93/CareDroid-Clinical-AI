import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_UTILITY_NAV_ITEMS,
  ADVANCED_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  getPrimaryNavItemForPath,
  PRIMARY_MOBILE_NAV_ITEMS,
  PRIMARY_NAV_BY_ID,
  PRIMARY_SIDEBAR_NAV_ITEMS,
  primaryNavPathMatches,
  SECONDARY_NAV_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
} from './primaryNavigation';
import { CANONICAL_ROUTES } from '../config/routes.config';

const VISIBLE_SIDEBAR_ITEMS = [
  ...PRIMARY_SIDEBAR_NAV_ITEMS,
  ...ADVANCED_SIDEBAR_NAV_ITEMS,
];

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

  it('keeps operations destinations grouped for command/search instead of persistent sidebar nav', () => {
    expect(OPERATIONS_SIDEBAR_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual([
      ['Twin Intelligence', '/digital-twin-intelligence'],
      ['Digital Twin', '/digital-twin'],
      ['Hospital Map', '/hospital-map'],
      ['Medical IoT', '/medical-iot'],
      ['Devices', '/devices'],
      ['Fleet Map', '/fleet/map'],
      ['Live Map', '/live-map'],
      ['Usage', '/usage'],
    ]);
    for (const item of OPERATIONS_SIDEBAR_NAV_ITEMS) {
      expect(PRIMARY_SIDEBAR_NAV_ITEMS.map((nav) => nav.path)).not.toContain(item.path);
    }
  });

  it('keeps developer and governance routes in the collapsed advanced group', () => {
    expect(ADVANCED_SIDEBAR_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual([
      ['Asset Packs', '/asset-packs'],
      ['Products', '/products'],
      ['Organization', '/organization'],
      ['Platform Admin', '/platform-admin'],
      ['Configuration Studio', '/configuration-studio'],
      ['Developer Catalog', '/tools/catalog'],
      ['System Health', '/system-health'],
      ['SaaS Health', '/saas-health'],
      ['Feature Flags', '/feature-flags'],
      ['Plugins', '/plugins'],
      ['Dependency Map', '/dependency-map'],
      ['Dependency Graph', '/dependency-graph'],
      ['Governance Registry', '/governance-registry'],
      ['Data Lineage', '/data-lineage'],
      ['Self Diagnostics', '/self-diagnostics'],
      ['Learning Engine', '/platform-learning-engine'],
      ['Brain', '/brain'],
      ['AI Evaluation', '/ai-evaluation'],
      ['Governance', '/ai-governance'],
      ['Security', '/security'],
      ['Audit', '/audit'],
      ['Regulatory', '/regulatory'],
      ['Assets', '/assets'],
    ]);
  });

  it('keeps solution builder discoverable in the solutions group', () => {
    expect(SOLUTIONS_SIDEBAR_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual(
      expect.arrayContaining([
        ['Solution Builder', '/solution-builder'],
        ['Value Tracking', '/value-tracking'],
        ['Success Center', '/success-center'],
      ])
    );
    expect(getPrimaryNavItemForPath('/solution-builder')?.id).toBe('solution-builder');
    expect(getPrimaryNavItemForPath('/value-tracking')?.id).toBe('value-tracking');
    expect(getPrimaryNavItemForPath('/customer-success')?.id).toBe('customer-success');
  });

  it('does not duplicate visible sidebar destinations', () => {
    const paths = VISIBLE_SIDEBAR_ITEMS.map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('does not duplicate visible sidebar labels', () => {
    const labels = VISIBLE_SIDEBAR_ITEMS.map((item) => item.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('uses canonical routes for every visible sidebar destination', () => {
    const canonicalPaths = new Set(Object.values(CANONICAL_ROUTES));
    for (const item of VISIBLE_SIDEBAR_ITEMS) {
      expect(canonicalPaths.has(item.path), `${item.label} -> ${item.path}`).toBe(true);
    }
  });

  it('does not activate multiple visible sidebar items for known nav paths', () => {
    const paths = new Set(
      VISIBLE_SIDEBAR_ITEMS.flatMap((item) => [
        item.path,
        ...(item.matchPaths || []),
        ...(item.legacyPaths || []),
      ]).filter(Boolean)
    );

    for (const path of paths) {
      const matches = VISIBLE_SIDEBAR_ITEMS.filter((item) => primaryNavPathMatches(item, path));

      expect(
        matches.map((item) => item.id),
        path
      ).toHaveLength(1);
    }
  });

  it('keeps the compact drawer navigation subset canonical', () => {
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
    expect(primaryNavPathMatches(PRIMARY_NAV_BY_ID['developer-audit'], '/tools/catalog')).toBe(
      true
    );
    expect(primaryNavPathMatches(PRIMARY_NAV_BY_ID.tools, '/tools/catalog')).toBe(false);
    expect(primaryNavPathMatches(PRIMARY_NAV_BY_ID.settings, '/tools/catalog')).toBe(false);
  });

  it('keeps calculator routes under the Tools nav item without a duplicate sidebar destination', () => {
    expect(ADVANCED_SIDEBAR_NAV_ITEMS.some((item) => item.path === '/tools/calculators')).toBe(
      false
    );
    expect(getPrimaryNavItemForPath('/tools/calculators/sofa')?.id).toBe('tools');
  });

  it('keeps operations leaf routes under the primary Operations concept', () => {
    expect(getPrimaryNavItemForPath('/live-map')?.id).toBe('operations');
    expect(getPrimaryNavItemForPath('/maps')?.id).toBe('operations');
    expect(getPrimaryNavItemForPath('/hospital-map')?.id).toBe('operations');
    expect(getPrimaryNavItemForPath('/medical-iot')?.id).toBe('operations');
    expect(getPrimaryNavItemForPath('/devices')?.id).toBe('operations');
    expect(getPrimaryNavItemForPath('/fleet/map')?.id).toBe('operations');
    expect(getPrimaryNavItemForPath('/fleet/route-optimizer')?.id).toBe('operations');
    expect(getPrimaryNavItemForPath('/operations/incidents')?.id).toBe('operations');
    expect(getPrimaryNavItemForPath('/digital-twin')?.id).toBe('operations');
    expect(getPrimaryNavItemForPath('/digital-twin-intelligence')?.id).toBe('operations');
    expect(getPrimaryNavItemForPath('/operations')?.id).toBe('operations');
  });

  it('keeps profile and settings in primary navigation while account utilities remain searchable', () => {
    const expected = [
      ['/profile', 'profile'],
      ['/profile/activity', 'profile'],
      ['/profile/tool-preferences', 'profile'],
      ['/profile/settings', 'settings'],
      ['/profile/preferences', 'settings'],
      ['/settings', 'settings'],
      ['/tenant-admin', 'platform-admin'],
    ];

    for (const [path, itemId] of expected) {
      const matches = PRIMARY_SIDEBAR_NAV_ITEMS.filter((item) => primaryNavPathMatches(item, path));

      expect(
        matches.map((item) => item.id),
        path
      ).toEqual(['profile', 'settings'].includes(itemId) ? [itemId] : []);
      expect(getPrimaryNavItemForPath(path)?.id, path).toBe(itemId);
    }

    expect(ACCOUNT_UTILITY_NAV_ITEMS.map((item) => item.id)).toEqual([
      'discover',
      'automation',
      'customer-portal',
      'knowledge-base',
      'marketplace',
      'enterprise-readiness',
      'platform-admin',
      'tenant-admin',
      'billing',
      'notifications',
    ]);
  });

  it('keeps Discover and Automation searchable without making them primary', () => {
    expect(SECONDARY_NAV_ITEMS).toEqual([]);
    expect(ACCOUNT_UTILITY_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual(
      expect.arrayContaining([
        ['Discover', '/discover'],
        ['Automation', '/automation'],
      ])
    );
    expect(PRIMARY_SIDEBAR_NAV_ITEMS.map((item) => item.id)).not.toEqual(
      expect.arrayContaining(['discover', 'automation'])
    );
  });
});
