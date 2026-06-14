import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUTE,
  NAVIGATION_ITEMS,
  NAV_ITEMS,
  PILOT_CUSTOMER_MODE,
  getPilotCustomerNavigationItems,
  getVisibleNavigation,
  resolveFeatureGate,
} from './unified-navigation.config';

const REQUESTED_ITEMS = [
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    icon: 'layout-dashboard',
    route: '/emergency/whiteboard',
    featureGate: null,
  },
  {
    id: 'patients',
    label: 'Patients',
    icon: 'emergency-patients',
    route: '/emergency/patients',
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
    id: 'intake',
    label: 'Intake',
    icon: 'intake',
    route: '/emergency/intake',
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
    label: 'Capacity',
    icon: 'capacity',
    route: '/emergency/capacity',
    featureGate: 'capacity_intel',
  },
  {
    id: 'boarding',
    label: 'Boarding',
    icon: 'boarding',
    route: '/emergency/boarding',
    featureGate: null,
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
];

const PILOT_VISIBLE_ITEMS = REQUESTED_ITEMS.filter(
  (item) => !['analytics', 'settings'].includes(item.id),
);

describe('unified navigation config', () => {
  it('exports the exact requested Emergency OS nav items in order', () => {
    expect(DEFAULT_ROUTE).toBe('/emergency/whiteboard');
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
      expect(item.id, item.label).toMatch(/^[a-z0-9_]+$/);
      expect(item.path, item.label).toMatch(/^\//);
      expect(item.route, item.label).toMatch(/^\//);
      expect(item.icon, item.label).toMatch(/^[a-z0-9-]+$/);
      expect(item.roles.length, item.label).toBeGreaterThan(0);
      expect(typeof item.isEmergencyCore, item.label).toBe('boolean');
    }
  });

  it('preserves 13 canonical items while exposing 11 pilot items', () => {
    expect(PILOT_CUSTOMER_MODE.enabled).toBe(true);
    expect(getPilotCustomerNavigationItems().map((item) => item.id)).toEqual(
      PILOT_VISIBLE_ITEMS.map((item) => item.id),
    );
    expect(PILOT_CUSTOMER_MODE.hiddenNavItemIds).toEqual(['analytics', 'settings']);
    expect(PILOT_CUSTOMER_MODE.retainedDirectRoutes).toEqual([
      '/emergency/analytics',
      '/emergency/pulse',
      '/emergency/settings',
      '/emergency/shift',
    ]);
  });

  it('uses distinct pilot sidebar icon keys for visual scanning', () => {
    const pilotIcons = getPilotCustomerNavigationItems().map((item) => item.icon);

    expect(pilotIcons).toEqual(PILOT_VISIBLE_ITEMS.map((item) => item.icon));
    expect(new Set(pilotIcons).size).toBe(pilotIcons.length);
  });

  it('shows the pilot surface to admin and read-only users', () => {
    expect(getVisibleNavigation('admin').map((item) => item.label)).toEqual(
      PILOT_VISIBLE_ITEMS.map((item) => item.label),
    );

    const readOnlyLabels = getVisibleNavigation('read_only_viewer').map((item) => item.label);
    expect(readOnlyLabels).toEqual([
      'Whiteboard',
      'Patients',
      'EMS',
      'Intake',
      'Queues',
      'Reassess',
      'Capacity',
      'Boarding',
      'Referrals',
      'Copilot',
      'Medical Tools',
    ]);
    expect(readOnlyLabels).not.toContain('Analytics');
    expect(readOnlyLabels).not.toContain('Settings');
  });

  it('resolves requested feature gate aliases to registered feature ids', () => {
    expect(resolveFeatureGate('ems_pipeline')).toBe('ems_pipeline');
    expect(resolveFeatureGate('referral_intel')).toBe('referral_intelligence');
    expect(resolveFeatureGate('capacity_intel')).toBe('capacity_intelligence');
    expect(resolveFeatureGate(null)).toBeNull();
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
