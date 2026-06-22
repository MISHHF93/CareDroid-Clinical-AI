import { describe, expect, it } from 'vitest';
import {
  buildCommandCenterFallbackSnapshot,
  buildDepartmentStatusFallbackSnapshot,
  buildDisplayRefreshStatus,
  DISPLAY_AUTO_REFRESH_DEFAULT_MS,
  DISPLAY_AUTO_REFRESH_MIN_MS,
  isDisplayAutoRefreshScreenMode,
  resolveDisplayRefreshIntervalMs,
  summarizeDisplayRefreshErrors,
} from './displayAutoRefreshModel';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';

describe('displayAutoRefreshModel', () => {
  it('identifies normalized display screen modes', () => {
    expect(isDisplayAutoRefreshScreenMode(CARE_DROID_SCREEN_MODES.publicWaiting)).toBe(true);
    expect(isDisplayAutoRefreshScreenMode(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard)).toBe(true);
    expect(isDisplayAutoRefreshScreenMode(CARE_DROID_SCREEN_MODES.commandCenter)).toBe(true);
    expect(isDisplayAutoRefreshScreenMode(CARE_DROID_SCREEN_MODES.chargeNurse)).toBe(false);
  });

  it('resolves refresh interval from settings with minimum clamp', () => {
    expect(
      resolveDisplayRefreshIntervalMs(CARE_DROID_SCREEN_MODES.publicWaiting, {
        wallDisplayRefreshInterval: 45000,
      }),
    ).toBe(45000);

    expect(
      resolveDisplayRefreshIntervalMs(CARE_DROID_SCREEN_MODES.publicWaiting, {
        wallDisplayRefreshInterval: 5000,
      }),
    ).toBe(DISPLAY_AUTO_REFRESH_MIN_MS);

    expect(
      resolveDisplayRefreshIntervalMs(CARE_DROID_SCREEN_MODES.commandCenter, {
        wallDisplayRefreshInterval: DISPLAY_AUTO_REFRESH_DEFAULT_MS,
        screenModeRefreshIntervals: {
          [CARE_DROID_SCREEN_MODES.commandCenter]: 60000,
        },
      }),
    ).toBe(60000);
  });

  it('summarizes partial refresh failures', () => {
    expect(
      summarizeDisplayRefreshErrors({
        errors: { patients: 'timeout', capacity: null },
      } as never),
    ).toBe('patients: timeout');

    expect(summarizeDisplayRefreshErrors(null, new Error('network down'))).toBe('network down');
  });

  it('marks stale and error refresh states without hiding cached content', () => {
    const now = new Date('2026-06-22T12:00:00.000Z');
    const status = buildDisplayRefreshStatus({
      enabled: true,
      refreshIntervalMs: 30000,
      lastUpdatedAt: '2026-06-22T11:58:00.000Z',
      errorMessage: 'patients: timeout',
      hasCachedContent: true,
      now,
    });

    expect(status.tone).toBe('stale');
    expect(status.showStaleBanner).toBe(true);
    expect(status.hasCachedContent).toBe(true);
  });

  it('provides non-empty fallback snapshots for display screens', () => {
    const department = buildDepartmentStatusFallbackSnapshot('2026-06-22T12:00:00.000Z');
    const commandCenter = buildCommandCenterFallbackSnapshot('2026-06-22T12:00:00.000Z');

    expect(department.metrics.length).toBeGreaterThan(0);
    expect(department.summaryLine).toMatch(/unavailable/i);
    expect(commandCenter.metrics.length).toBeGreaterThan(0);
    expect(commandCenter.summaryLine).toMatch(/cached/i);
  });
});
