import { describe, expect, it } from 'vitest';
import {
  ALARM_SURFACE,
  resolveAlarmSurfacePlan,
  shouldShowOperationalToast,
} from './operationalAlarmPolicy';

describe('operationalAlarmPolicy', () => {
  it('never routes alarms to fullscreen overlays or auto-open panels', () => {
    const critical = resolveAlarmSurfacePlan({
      id: 'a1',
      severity: 'Critical',
      title: 'Critical vitals',
      message: 'SpO2 low',
      createdAt: new Date().toISOString(),
      dismissed: false,
    } as any);

    expect(critical.useFullscreenOverlay).toBe(false);
    expect(critical.autoOpenPanel).toBe(false);
    expect(critical.surfaces).toContain(ALARM_SURFACE.sidebarPulse);
    expect(critical.surfaces).toContain(ALARM_SURFACE.shellDock);
  });

  it('does not surface operational alerts as Sonner toasts', () => {
    expect(
      shouldShowOperationalToast({
        id: 'a2',
        severity: 'Warning',
        title: 'Queue delay',
        message: 'Wait exceeded',
        createdAt: new Date().toISOString(),
        dismissed: false,
      } as any),
    ).toBe(false);
  });
});
