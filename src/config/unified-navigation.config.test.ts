import { describe, expect, it } from 'vitest';
import { DEFAULT_ROUTE, NAVIGATION_ITEMS, getVisibleNavigation } from './unified-navigation.config';

const REQUESTED_LABELS = [
  'Emergency Whiteboard',
  'EMS Intake',
  'Queues',
  'Reassessment',
  'Capacity',
  'Surge Management',
  'Safety Dashboard',
  'Virtual Care',
  'Wearable Monitor',
  'Patients',
  'ED Copilot',
  'AI Governance',
  'Settings',
];

describe('unified navigation config', () => {
  it('exports the requested Emergency OS pages in order', () => {
    expect(DEFAULT_ROUTE).toBe('/');
    expect(NAVIGATION_ITEMS.map((item) => item.label)).toEqual(REQUESTED_LABELS);
    expect(NAVIGATION_ITEMS.map((item) => item.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('keeps every item complete and route-backed', () => {
    for (const item of NAVIGATION_ITEMS) {
      expect(item.id, item.label).toMatch(/^[a-z0-9_]+$/);
      expect(item.path, item.label).toMatch(/^\//);
      expect(item.icon, item.label).toMatch(/^[a-z0-9-]+$/);
      expect(item.roles.length, item.label).toBeGreaterThan(0);
      expect(typeof item.isEmergencyCore, item.label).toBe('boolean');
    }
  });

  it('shows every page to admin and filters sensitive pages for read-only users', () => {
    expect(getVisibleNavigation('admin').map((item) => item.label)).toEqual(REQUESTED_LABELS);

    const readOnlyLabels = getVisibleNavigation('read_only_viewer').map((item) => item.label);
    expect(readOnlyLabels).toEqual([
      'Emergency Whiteboard',
      'Queues',
      'Reassessment',
      'Capacity',
      'Safety Dashboard',
      'Patients',
    ]);
    expect(readOnlyLabels).not.toContain('Settings');
    expect(readOnlyLabels).not.toContain('AI Governance');
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
