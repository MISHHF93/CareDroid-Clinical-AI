import { describe, expect, it } from 'vitest';
import { DEFAULT_ROUTE, NAVIGATION_ITEMS, NAV_ITEMS, getVisibleNavigation, resolveFeatureGate } from './unified-navigation.config';

const REQUESTED_ITEMS = [
  { id: 'whiteboard', label: 'Emergency Whiteboard', icon: 'layout-dashboard', route: '/emergency', featureGate: null },
  { id: 'pulse', label: 'Department Pulse', icon: 'department-pulse', route: '/emergency/pulse', featureGate: null },
  { id: 'ems', label: 'EMS Pipeline', icon: 'ambulance', route: '/emergency/ems', featureGate: 'ems_pipeline' },
  { id: 'referrals', label: 'Referrals', icon: 'send', route: '/emergency/referrals', featureGate: 'referral_intel' },
  { id: 'capacity', label: 'Capacity', icon: 'chart-bar', route: '/emergency/capacity', featureGate: 'capacity_intel' },
  { id: 'tools', label: 'Clinical Tools', icon: 'stethoscope', route: '/emergency/tools', featureGate: 'clinical_tools' },
  { id: 'shift', label: 'Shift Summary', icon: 'report-analytics', route: '/emergency/shift', featureGate: null },
  { id: 'settings', label: 'Settings', icon: 'settings', route: '/settings', featureGate: null },
];

describe('unified navigation config', () => {
  it('exports the exact requested Emergency OS nav items in order', () => {
    expect(DEFAULT_ROUTE).toBe('/emergency/whiteboard');
    expect(NAV_ITEMS).toEqual(REQUESTED_ITEMS);
    expect(NAVIGATION_ITEMS.map(({ id, label, icon, route, featureGate }) => ({ id, label, icon, route, featureGate }))).toEqual(REQUESTED_ITEMS);
    expect(NAVIGATION_ITEMS.map((item) => item.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
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
    expect(getVisibleNavigation('admin').map((item) => item.label)).toEqual(REQUESTED_ITEMS.map((item) => item.label));

    const readOnlyLabels = getVisibleNavigation('read_only_viewer').map((item) => item.label);
    expect(readOnlyLabels).toEqual([
      'Emergency Whiteboard',
      'Department Pulse',
      'EMS Pipeline',
      'Referrals',
      'Capacity',
      'Clinical Tools',
      'Shift Summary',
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
