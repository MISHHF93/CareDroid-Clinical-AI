import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_UTILITY_NAV_ITEMS,
  ADVANCED_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  canExposeNavigationItem,
  getPrimaryNavItemForPath,
  PRIMARY_MOBILE_NAV_ITEMS,
  PRIMARY_NAV_BY_ID,
  PRIMARY_SIDEBAR_NAV_ITEMS,
  primaryNavPathMatches,
  SECONDARY_NAV_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
} from './primaryNavigation';
import { CANONICAL_ROUTES } from '../config/routes.config';

const VISIBLE_SIDEBAR_ITEMS = PRIMARY_SIDEBAR_NAV_ITEMS;
const SIDEBAR_MODEL = [
  ['Reception', '/emergency/reception'],
  ['Whiteboard', '/emergency/whiteboard'],
  ['Intake', '/emergency/intake'],
  ['EMS', '/emergency/ems'],
  ['Patients', '/emergency/patients'],
  ['Queues', '/emergency/queues'],
  ['Reassess', '/emergency/reassessment'],
  ['Capacity', '/emergency/capacity'],
  ['Boarding', '/emergency/boarding'],
  ['Referrals', '/emergency/referrals'],
  ['Copilot', '/emergency/copilot'],
  ['Medical Tools', '/emergency/tools'],
  ['Analytics', '/emergency/analytics'],
  ['Settings', '/emergency/settings'],
  ['Integrations', '/integrations/hub'],
  ['Cosmos', '/cosmos'],
  ['Platform', '/workspace'],
  ['Pulse', '/emergency/pulse'],
  ['Shift', '/emergency/shift'],
];

describe('primaryNavigation', () => {
  it('exposes the canonical sidebar-first Emergency OS model in order', () => {
    expect(PRIMARY_SIDEBAR_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual(SIDEBAR_MODEL);
    expect(PRIMARY_SIDEBAR_NAV_ITEMS.map((item) => item.route)).toEqual(
      SIDEBAR_MODEL.map(([, path]) => path),
    );
    expect(PRIMARY_SIDEBAR_NAV_ITEMS).toHaveLength(SIDEBAR_MODEL.length);
  });

  it('keeps operations destinations grouped for command/search instead of persistent sidebar nav', () => {
    expect(OPERATIONS_SIDEBAR_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual([
      ['Workflow Mining', '/workflow-mining'],
      ['Workspace Graph', '/workspace-dependency-graph'],
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
    expect(getPrimaryNavItemForPath('/workflow-mining')?.id).toBe('workflow-mining');
    expect(getPrimaryNavItemForPath('/workspace-dependency-graph')?.id).toBe(
      'workspace-dependency-graph',
    );
  });

  it('keeps developer and governance routes in the searchable advanced catalog', () => {
    expect(ADVANCED_SIDEBAR_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual([
      ['Organization', '/organization'],
      ['Executive', '/executive'],
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
      ['Business Brain', '/business-brain'],
      ['AI Evaluation', '/ai-evaluation'],
      ['Governance', '/emergency/ai-governance'],
      ['Security', '/security'],
      ['Audit', '/audit'],
      ['Regulatory', '/regulatory'],
      ['Assets', '/assets'],
    ]);
    expect(getPrimaryNavItemForPath('/business-brain')?.id).toBe('business-brain');
  });

  it('keeps solution builder discoverable in the solutions group', () => {
    expect(SOLUTIONS_SIDEBAR_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual(
      expect.arrayContaining([
        ['Solution Builder', '/solution-builder'],
        ['Value Tracking', '/value-tracking'],
        ['Product Intelligence', '/product-intelligence'],
        ['Expansion Opportunities', '/expansion-opportunities'],
        ['Readiness Assessment', '/maturity-assessment'],
        ['Success Center', '/success-center'],
      ]),
    );
    expect(getPrimaryNavItemForPath('/solution-builder')?.id).toBe('solution-builder');
    expect(getPrimaryNavItemForPath('/value-tracking')?.id).toBe('value-tracking');
    expect(getPrimaryNavItemForPath('/product-intelligence')?.id).toBe('product-intelligence');
    expect(getPrimaryNavItemForPath('/expansion-opportunities')?.id).toBe(
      'expansion-opportunities',
    );
    expect(getPrimaryNavItemForPath('/maturity-assessment')?.id).toBe('maturity-assessment');
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
      ]).filter(Boolean),
    );

    for (const path of paths) {
      const matches = VISIBLE_SIDEBAR_ITEMS.filter((item) => primaryNavPathMatches(item, path));

      expect(
        matches.map((item) => item.id),
        path,
      ).toHaveLength(1);
    }
  });

  it('keeps the compact drawer navigation subset canonical', () => {
    expect(PRIMARY_MOBILE_NAV_ITEMS.map((item) => item.path)).toEqual(
      SIDEBAR_MODEL.map(([, path]) => path),
    );
  });

  it('assigns /tools/catalog to the permissioned Developer Audit entry only', () => {
    expect(getPrimaryNavItemForPath('/tools/catalog')?.id).toBe('developer-audit');
    expect(primaryNavPathMatches(PRIMARY_NAV_BY_ID['developer-audit'], '/tools/catalog')).toBe(
      true,
    );
    expect(PRIMARY_NAV_BY_ID.tools.path).toBe('/emergency/tools');
    expect(PRIMARY_NAV_BY_ID.settings.path).toBe('/emergency/settings');
  });

  it('keeps legacy calculator routes outside primary nav without a duplicate sidebar destination', () => {
    expect(ADVANCED_SIDEBAR_NAV_ITEMS.some((item) => item.path === '/tools/calculators')).toBe(
      false,
    );
    expect(PRIMARY_SIDEBAR_NAV_ITEMS.some((item) => item.path === '/tools')).toBe(false);
    expect(PRIMARY_SIDEBAR_NAV_ITEMS.some((item) => item.path === '/emergency/tools')).toBe(true);
  });

  it('keeps Emergency operations routes under the primary Operations concept', () => {
    expect(getPrimaryNavItemForPath('/workspace/emergency/flow')?.id).toBeUndefined();
    expect(getPrimaryNavItemForPath('/workspace/emergency/referrals')?.id).toBeUndefined();
    expect(getPrimaryNavItemForPath('/workspace/emergency/capacity')?.id).toBeUndefined();
    expect(getPrimaryNavItemForPath('/workspace/emergency/analytics')?.id).toBeUndefined();
    expect(getPrimaryNavItemForPath('/workspace/emergency/boarding')?.id).toBeUndefined();
  });

  it('keeps only canonical Emergency OS sidebar surfaces primary', () => {
    const expected = [
      ['/emergency', 'whiteboard'],
      ['/emergency/whiteboard', 'whiteboard'],
      ['/emergency/intake', 'intake'],
      ['/emergency/ems', 'ems'],
      ['/emergency/patients', 'patients'],
      ['/emergency/queues', 'queues'],
      ['/emergency/reassessment', 'reassessment'],
      ['/emergency/capacity', 'capacity'],
      ['/emergency/boarding', 'boarding'],
      ['/emergency/referrals', 'referrals'],
      ['/emergency/copilot', 'copilot'],
      ['/emergency/analytics', 'analytics'],
      ['/emergency/settings', 'settings'],
      ['/settings', 'settings'],
      ['/emergency/pulse', 'pulse'],
      ['/emergency/journey', undefined],
      ['/emergency/provincial-health', undefined],
      ['/emergency/integrations', undefined],
      ['/emergency/simulation', undefined],
      ['/emergency/tools', 'tools'],
      ['/emergency/shift', 'shift'],
      ['/profile', undefined],
      ['/workspaces', 'platform'],
      ['/workspace', 'platform'],
      ['/tenant-admin', 'tenant-admin'],
    ];

    const persistentIds = new Set(PRIMARY_SIDEBAR_NAV_ITEMS.map((item) => item.id));
    for (const [path, itemId] of expected) {
      const matches = PRIMARY_SIDEBAR_NAV_ITEMS.filter((item) => primaryNavPathMatches(item, path));

      expect(
        matches.map((item) => item.id),
        path,
      ).toEqual(persistentIds.has(itemId) ? [itemId] : []);
      expect(getPrimaryNavItemForPath(path)?.id, path).toBe(itemId);
    }

    expect(ACCOUNT_UTILITY_NAV_ITEMS.map((item) => item.id)).toEqual([
      'search',
      'discover',
      'workflows',
      'customer-portal',
      'knowledge-hub',
      'knowledge-base',
      'marketplace',
      'enterprise-readiness',
      'platform-admin',
      'tenant-admin',
      'billing',
      'notifications',
    ]);
  });

  it('applies progressive disclosure rules to command and search destinations', () => {
    const byId = Object.fromEntries(
      [
        ...Object.values(PRIMARY_NAV_BY_ID),
        ...ACCOUNT_UTILITY_NAV_ITEMS,
        ...SOLUTIONS_SIDEBAR_NAV_ITEMS,
        ...OPERATIONS_SIDEBAR_NAV_ITEMS,
        ...ADVANCED_SIDEBAR_NAV_ITEMS,
      ].map((item) => [item.id, item]),
    );

    expect(byId.home).toBeUndefined();
    expect(byId.profile).toBeUndefined();
    expect(canExposeNavigationItem(byId.whiteboard)).toBe(true);
    expect(canExposeNavigationItem(byId.analytics)).toBe(true);
    expect(canExposeNavigationItem(byId.settings)).toBe(true);
    expect(canExposeNavigationItem(byId.search)).toBe(true);
    expect(canExposeNavigationItem(byId['workflow-mining'])).toBe(false);
    expect(canExposeNavigationItem(byId['workflow-mining'], { includeContextual: true })).toBe(
      true,
    );
    expect(canExposeNavigationItem(byId['platform-admin'], { includeContextual: true })).toBe(
      false,
    );
    expect(
      canExposeNavigationItem(byId['platform-admin'], { permissions: ['CONFIGURE_SYSTEM'] }),
    ).toBe(true);
  });

  it('keeps Discover and Workflows searchable without making them primary', () => {
    expect(SECONDARY_NAV_ITEMS).toEqual([]);
    expect(ACCOUNT_UTILITY_NAV_ITEMS.map((item) => [item.label, item.path])).toEqual(
      expect.arrayContaining([
        ['Discover', '/discover'],
        ['Workflows', '/workflows'],
        ['Knowledge Hub', '/knowledge-hub'],
      ]),
    );
    expect(PRIMARY_SIDEBAR_NAV_ITEMS.map((item) => item.id)).not.toEqual(
      expect.arrayContaining(['discover', 'workflows']),
    );
  });
});
