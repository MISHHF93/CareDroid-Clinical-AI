import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_UTILITY_NAV_ITEMS,
  ADVANCED_SIDEBAR_NAV_ITEMS,
  APP_SHELL_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  PRIMARY_SIDEBAR_NAV_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
} from '../config/navigation.config';
import { CHROME_ICONS, getNavIcon, getToolIcon } from './iconRegistry';

const ALL_NAV_ITEMS = [
  ...PRIMARY_SIDEBAR_NAV_ITEMS,
  ...OPERATIONS_SIDEBAR_NAV_ITEMS,
  ...SOLUTIONS_SIDEBAR_NAV_ITEMS,
  ...ADVANCED_SIDEBAR_NAV_ITEMS,
  ...ACCOUNT_UTILITY_NAV_ITEMS,
];

describe('iconRegistry semantic icon map', () => {
  it('keeps Operations distinct from fleet or vehicle-only iconography', () => {
    expect(getNavIcon('operations')).toBe(CHROME_ICONS.activity);
    expect(getNavIcon('operations')).not.toBe(CHROME_ICONS.truck);
    expect(getNavIcon('operations')).not.toBe(getNavIcon('fleet'));
  });

  it('keeps Fleet and dispatch routes vehicle-specific', () => {
    expect(getNavIcon('fleet')).toBe(CHROME_ICONS.truck);
    expect(getToolIcon('fleet-live-map')).toBe(CHROME_ICONS.truck);
    expect(getToolIcon('fleet-command')).toBe(CHROME_ICONS.truck);
  });

  it('uses clinical operations symbols for devices, IoT, maps, governance, audit, profile, and settings', () => {
    expect(getNavIcon('devices')).toBe(CHROME_ICONS.smartphone);
    expect(getToolIcon('device-fleet-management')).toBe(CHROME_ICONS.smartphone);
    expect(getNavIcon('medical-iot')).toBe(CHROME_ICONS.activity);
    expect(getNavIcon('hospital-map')).toBe(CHROME_ICONS.hospital);
    expect(getNavIcon('governance')).toBe(CHROME_ICONS.shield);
    expect(getNavIcon('ai-governance')).toBe(CHROME_ICONS.shield);
    expect(getNavIcon('security')).toBe(CHROME_ICONS.lock);
    expect(getNavIcon('audit')).toBe(CHROME_ICONS.clipboardList);
    expect(getNavIcon('profile')).toBe(CHROME_ICONS.user);
    expect(getNavIcon('settings')).toBe(CHROME_ICONS.settings);
  });

  it('keeps Emergency OS rail icons semantically distinct', () => {
    expect(getNavIcon('emergency-whiteboard')).toBe(CHROME_ICONS.layoutDashboard);
    expect(getNavIcon('layout-dashboard')).toBe(CHROME_ICONS.layoutDashboard);
    expect(getNavIcon('emergency-patients')).toBe(CHROME_ICONS.users);
    expect(getNavIcon('journey')).toBe(CHROME_ICONS.gitBranch);
    expect(getNavIcon('ambulance')).toBe(CHROME_ICONS.truck);
    expect(getNavIcon('send')).toBe(CHROME_ICONS.share);
    expect(getNavIcon('chart-bar')).toBe(CHROME_ICONS.barChart);
    expect(getNavIcon('department-pulse')).toBe(CHROME_ICONS.heartPulse);
    expect(getNavIcon('stethoscope')).toBe(CHROME_ICONS.stethoscope);
    expect(getNavIcon('report-analytics')).toBe(CHROME_ICONS.clipboardList);
    expect(getNavIcon('queues')).toBe(CHROME_ICONS.clock);
    expect(getNavIcon('reassessment')).toBe(CHROME_ICONS.calendarClock);
    expect(getNavIcon('capacity')).toBe(CHROME_ICONS.gauge);
    expect(getNavIcon('boarding')).toBe(CHROME_ICONS.hospital);
    expect(getNavIcon('referrals')).toBe(CHROME_ICONS.share);
    expect(getNavIcon('provincial-health')).toBe(CHROME_ICONS.shield);
    expect(getNavIcon('integrations')).toBe(CHROME_ICONS.shareLink);

    const railIcons = APP_SHELL_NAV_ITEMS.map((item) => getNavIcon(item.iconKey || item.id));
    expect(new Set(railIcons).size).toBeGreaterThanOrEqual(6);
  });

  it('resolves an icon for every navigation destination', () => {
    for (const item of ALL_NAV_ITEMS) {
      expect(getNavIcon(item.id), item.id).toBeTruthy();
    }
  });
});
