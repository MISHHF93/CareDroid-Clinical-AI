import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUTE,
  NAVIGATION_ITEMS,
  NAV_ITEMS,
  PILOT_CORE_NAV_ITEM_IDS,
  PILOT_CUSTOMER_VISIBLE_NAV_ITEM_IDS,
  PILOT_UTILITY_NAV_ITEM_IDS,
  PILOT_CUSTOMER_MODE,
  PILOT_EXTENSION_NAV_ITEM_IDS,
  getPilotCustomerNavigationItems,
  getVisibleNavigation,
  getVisibleNavigationForSaasRole,
  resolveFeatureGate,
} from './unified-navigation.config';

const REQUESTED_ITEMS = [
  {
    id: 'reception',
    label: 'Reception',
    icon: 'user-check',
    route: '/emergency/reception',
    featureGate: null,
  },
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    icon: 'layout-dashboard',
    route: '/emergency/whiteboard',
    featureGate: null,
  },
  {
    id: 'intake',
    label: 'Intake',
    icon: 'intake',
    route: '/emergency/intake',
    featureGate: null,
  },
  {
    id: 'ems',
    label: 'EMS',
    icon: 'ambulance',
    route: '/emergency/ems',
    featureGate: 'ems_pipeline',
  },
  {
    id: 'patients',
    label: 'Patients',
    icon: 'emergency-patients',
    route: '/emergency/patients',
    featureGate: null,
  },
  {
    id: 'queues',
    label: 'Queues',
    icon: 'queues',
    route: '/emergency/queues',
    featureGate: null,
  },
  {
    id: 'reassessment',
    label: 'Reassess',
    icon: 'reassessment',
    route: '/emergency/reassessment',
    featureGate: null,
  },
  {
    id: 'capacity',
    label: 'Flow & Capacity',
    icon: 'capacity',
    route: '/emergency/capacity',
    featureGate: 'capacity_intel',
  },
  {
    id: 'referrals',
    label: 'Referrals',
    icon: 'referrals',
    route: '/emergency/referrals',
    featureGate: 'referral_intel',
  },
  {
    id: 'copilot',
    label: 'Copilot',
    icon: 'ed-copilot',
    route: '/emergency/copilot',
    featureGate: null,
  },
  {
    id: 'tools',
    label: 'Medical Tools',
    icon: 'clinical-tools',
    route: '/emergency/tools',
    featureGate: null,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'emergency-analytics',
    route: '/emergency/analytics',
    featureGate: null,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    route: '/emergency/settings',
    featureGate: null,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'integrations',
    route: '/integrations/hub',
    featureGate: null,
  },
  {
    id: 'cosmos',
    label: 'Cosmos',
    icon: 'chart-bar',
    route: '/cosmos',
    featureGate: null,
  },
  {
    id: 'platform',
    label: 'Platform',
    icon: 'platform',
    route: '/workspace',
    featureGate: null,
  },
  {
    id: 'pulse',
    label: 'Pulse',
    icon: 'activity',
    route: '/emergency/pulse',
    featureGate: null,
  },
  {
    id: 'shift',
    label: 'Shift',
    icon: 'clock',
    route: '/emergency/shift',
    featureGate: null,
  },
  {
    id: 'fleet',
    label: 'Fleet',
    icon: 'ambulance',
    route: '/fleet/command',
    featureGate: null,
  },
  {
    id: 'surveillance',
    label: 'Surveillance',
    icon: 'activity',
    route: '/surveillance/nexus',
    featureGate: null,
  },
  {
    id: 'simulation',
    label: 'Simulation',
    icon: 'list-check',
    route: '/simulation',
    featureGate: null,
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    icon: 'stethoscope',
    route: '/laboratory',
    featureGate: null,
  },
  {
    id: 'knowledge',
    label: 'Knowledge Graph',
    icon: 'chart-bar',
    route: '/knowledge-graph',
    featureGate: null,
  },
  {
    id: 'audit',
    label: 'Audit',
    icon: 'report',
    route: '/audit',
    featureGate: null,
  },
  {
    id: 'ai-center',
    label: 'AI Center',
    icon: 'robot',
    route: '/ai-command-center',
    featureGate: null,
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: 'settings',
    route: '/admin',
    featureGate: null,
  },
];

const PILOT_VISIBLE_ITEMS = REQUESTED_ITEMS.filter((item) =>
  (PILOT_CUSTOMER_VISIBLE_NAV_ITEM_IDS as readonly string[]).includes(item.id),
);

describe('unified navigation config', () => {
  it('exports the exact requested CareDroid nav items in order', () => {
    expect(DEFAULT_ROUTE).toBe('/emergency/reception');
    expect(NAV_ITEMS).toEqual(REQUESTED_ITEMS);
    expect(
      NAVIGATION_ITEMS.map(({ id, label, icon, route, featureGate }) => ({
        id,
        label,
        icon,
        route,
        featureGate,
      })),
    ).toEqual(REQUESTED_ITEMS);
    expect(NAVIGATION_ITEMS.map((item) => item.order)).toEqual(
      REQUESTED_ITEMS.map((_item, index) => index + 1),
    );
  });

  it('keeps every item complete and route-backed', () => {
    for (const item of NAVIGATION_ITEMS) {
      expect(item.id, item.label).toMatch(/^[a-z0-9_-]+$/);
      expect(item.path, item.label).toMatch(/^\//);
      expect(item.route, item.label).toMatch(/^\//);
      expect(item.icon, item.label).toMatch(/^[a-z0-9-]+$/);
      expect(item.roles.length, item.label).toBeGreaterThan(0);
      expect(typeof item.isEmergencyCore, item.label).toBe('boolean');
    }
  });

  it('scopes pilot mode to core ED nav and hides extension surfaces', () => {
    expect(PILOT_CUSTOMER_MODE.enabled).toBe(true);
    const pilotNavIds = getPilotCustomerNavigationItems().map((item) => item.id);
    expect(pilotNavIds).toEqual(PILOT_VISIBLE_ITEMS.map((item) => item.id));
    for (const extensionId of PILOT_EXTENSION_NAV_ITEM_IDS) {
      expect(pilotNavIds).not.toContain(extensionId);
    }
    expect(PILOT_CUSTOMER_MODE.hiddenNavItemIds).toEqual([]);
    expect(PILOT_CUSTOMER_MODE.retainedDirectRoutes).toEqual([
      '/emergency/analytics',
      '/emergency/pulse',
      '/emergency/settings',
      '/emergency/shift',
      '/emergency/boarding',
    ]);
  });

  it('uses distinct pilot sidebar icon keys for visual scanning', () => {
    const pilotIcons = getPilotCustomerNavigationItems().map((item) => item.icon);

    expect(pilotIcons).toEqual(PILOT_VISIBLE_ITEMS.map((item) => item.icon));
    expect(new Set(pilotIcons).size).toBe(pilotIcons.length);
  });

  it('shows the pilot surface to admin and read-only users', () => {
    const adminLabels = getVisibleNavigation('admin').map((item) => item.label);
    const expectedAdminLabels = PILOT_VISIBLE_ITEMS.map((item) => item.label).filter(
      (label) => label !== 'Intake',
    );
    expect(adminLabels.sort()).toEqual(expectedAdminLabels.sort());
    expect(adminLabels).not.toContain('Cosmos');
    expect(adminLabels).not.toContain('Fleet');

    const readOnlyLabels = getVisibleNavigation('read_only_viewer').map((item) => item.label);
    expect(readOnlyLabels).toEqual(['Whiteboard', 'Analytics']);
    expect(readOnlyLabels).toContain('Analytics');
    expect(readOnlyLabels).not.toContain('Settings');
  });

  it('resolves requested feature gate aliases to registered feature ids', () => {
    expect(resolveFeatureGate('ems_pipeline')).toBe('ems_pipeline');
    expect(resolveFeatureGate('referral_intel')).toBe('referral_intelligence');
    expect(resolveFeatureGate('capacity_intel')).toBe('capacity_intelligence');
    expect(resolveFeatureGate(null)).toBeNull();
  });

  it('hides standalone intake nav for registration clerks', () => {
    const clerkNavIds = getVisibleNavigation('registration_clerk').map((item) => item.id);
    expect(clerkNavIds).toEqual(['reception', 'patients', 'pulse', 'shift']);
    expect(clerkNavIds).not.toContain('whiteboard');
    expect(clerkNavIds).not.toContain('intake');
    expect(clerkNavIds).not.toContain('queues');
    expect(clerkNavIds).not.toContain('tools');
    expect(clerkNavIds).not.toContain('platform');
  });

  it('scopes reception clerk pilot nav to front-desk utilities', () => {
    const clerkNavIds = getVisibleNavigationForSaasRole('registration-clerk').map((item) => item.id);
    expect(clerkNavIds).toEqual(expect.arrayContaining(['reception', 'patients', 'pulse', 'shift']));
    expect(clerkNavIds).not.toContain('whiteboard');
    expect(clerkNavIds).not.toContain('copilot');
  });

  it('hides extension integrations nav in pilot while keeping settings', () => {
    const adminNavIds = getVisibleNavigation('admin').map((item) => item.id);
    expect(adminNavIds).toContain('settings');
    expect(adminNavIds).not.toContain('integrations');
    expect(adminNavIds).not.toContain('intake');
    expect(adminNavIds).not.toContain('fleet');
    expect(adminNavIds).not.toContain('cosmos');
  });

  it('annotates navigation items with normalized suite metadata', () => {
    const whiteboard = NAVIGATION_ITEMS.find((item) => item.id === 'whiteboard');
    expect(whiteboard?.suiteId).toBe('emergency_whiteboard');
    expect(whiteboard?.suiteLabel).toBe('Emergency Whiteboard Suite');
  });

  it('assigns suite metadata to every pilot visible nav item', () => {
    for (const navId of PILOT_CUSTOMER_VISIBLE_NAV_ITEM_IDS) {
      const item = NAVIGATION_ITEMS.find((entry) => entry.id === navId);
      expect(item, `missing nav item: ${navId}`).toBeDefined();
      expect(item?.suiteId, `${navId} missing suiteId`).toBeTruthy();
      expect(item?.suiteLabel, `${navId} missing suiteLabel`).toBeTruthy();
    }
    expect(PILOT_UTILITY_NAV_ITEM_IDS).toEqual(['pulse', 'shift']);
    for (const extensionId of ['intake', 'integrations']) {
      expect(PILOT_EXTENSION_NAV_ITEM_IDS).toContain(extensionId);
      expect(PILOT_CORE_NAV_ITEM_IDS).not.toContain(extensionId);
    }
  });

  it('keeps physician navigation whiteboard-first with workflows on patient cards', () => {
    const physicianNavIds = getVisibleNavigation('physician').map((item) => item.id);
    expect(physicianNavIds).toEqual(['whiteboard', 'patients', 'copilot', 'tools', 'analytics']);
    expect(physicianNavIds).not.toContain('reception');
    expect(physicianNavIds).not.toContain('queues');
    expect(physicianNavIds).not.toContain('reassessment');
    expect(physicianNavIds).not.toContain('referrals');
    expect(physicianNavIds).not.toContain('boarding');
  });

  it('normalizes aliases and defaults unknown roles consistently', () => {
    expect(getVisibleNavigation('doctor').map((item) => item.id)).toEqual(
      getVisibleNavigation('physician').map((item) => item.id),
    );
    expect(getVisibleNavigation('unknown-role').map((item) => item.id)).toEqual(
      getVisibleNavigation('physician').map((item) => item.id),
    );
  });
});
