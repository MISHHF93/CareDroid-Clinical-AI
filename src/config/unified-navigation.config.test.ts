import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUTE,
  NAVIGATION_ITEMS,
  NAV_ITEMS,
  getVisibleNavigation,
  resolveFeatureGate,
} from './unified-navigation.config';

const REQUESTED_ITEMS = [
  {
    id: 'whiteboard',
    label: 'Board',
    icon: 'layout-dashboard',
    route: '/emergency/whiteboard',
    featureGate: null,
  },
  {
    id: 'pulse',
    label: 'Pulse',
    icon: 'department-pulse',
    route: '/emergency/pulse',
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
    id: 'journey',
    label: 'Journey',
    icon: 'journey',
    route: '/emergency/journey',
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
    id: 'ems',
    label: 'EMS',
    icon: 'ambulance',
    route: '/emergency/ems',
    featureGate: 'ems_pipeline',
  },
  {
    id: 'referrals',
    label: 'Referrals',
    icon: 'send',
    route: '/emergency/referrals',
    featureGate: 'referral_intel',
  },
  {
    id: 'provincial_health',
    label: 'Provincial',
    icon: 'provincial-health',
    route: '/emergency/provincial-health',
    featureGate: null,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'integrations',
    route: '/emergency/integrations',
    featureGate: null,
  },
  {
    id: 'capacity',
    label: 'Capacity',
    icon: 'chart-bar',
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
    id: 'copilot',
    label: 'Copilot',
    icon: 'ed-copilot',
    route: '/emergency/copilot',
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
    id: 'simulation',
    label: 'Sim',
    icon: 'list-check',
    route: '/emergency/simulation',
    featureGate: null,
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: 'stethoscope',
    route: '/emergency/tools',
    featureGate: 'clinical_tools',
  },
  {
    id: 'shift',
    label: 'Shift',
    icon: 'report-analytics',
    route: '/emergency/shift',
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

  it('shows every page to admin and filters sensitive pages for read-only users', () => {
    expect(getVisibleNavigation('admin').map((item) => item.label)).toEqual(
      REQUESTED_ITEMS.map((item) => item.label),
    );

    const readOnlyLabels = getVisibleNavigation('read_only_viewer').map((item) => item.label);
    expect(readOnlyLabels).toEqual([
      'Board',
      'Pulse',
      'Patients',
      'Journey',
      'Intake',
      'Queues',
      'Reassess',
      'EMS',
      'Referrals',
      'Provincial',
      'Integrations',
      'Capacity',
      'Boarding',
      'Copilot',
      'Analytics',
      'Sim',
      'Tools',
      'Shift',
    ]);
    expect(readOnlyLabels).not.toContain('Settings');
  });

  it('resolves requested feature gate aliases to registered feature ids', () => {
    expect(resolveFeatureGate('ems_pipeline')).toBe('ems_pipeline');
    expect(resolveFeatureGate('referral_intel')).toBe('referral_intelligence');
    expect(resolveFeatureGate('capacity_intel')).toBe('capacity_intelligence');
    expect(resolveFeatureGate('clinical_tools')).toBe('clinical_calculator_hub');
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
