import { describe, expect, it } from 'vitest';
import {
  WALL_DISPLAY_MONITOR_PRIVACY,
  applyWallDisplayMonitorPrivacy,
  normalizeWallDisplayMonitorPrivacy,
  shouldRedactCentralNodeForMonitorPrivacy,
} from './wallDisplayMonitorPrivacyModel';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import type { DepartmentStatusSnapshot } from '../components/whiteboard/departmentStatusScreenModel';

const baseSnapshot: DepartmentStatusSnapshot = {
  updatedAt: '2026-06-20T10:00:00.000Z',
  summaryLine: '4 waiting · 2 triage pending · 1 EMS inbound · Orange capacity',
  metrics: [
    {
      id: 'waiting-count',
      label: 'Waiting',
      value: 4,
      tone: 'stable',
      detail: 'Patients in the waiting room queue',
    },
    {
      id: 'longest-wait',
      label: 'Longest wait',
      value: '1h 35m',
      tone: 'warning',
      detail: 'Longest active wait duration — no patient identifiers',
    },
    {
      id: 'ems-inbound',
      label: 'EMS inbound',
      value: 1,
      tone: 'info',
      detail: 'Next arrival 8 min',
    },
    {
      id: 'capacity-status',
      label: 'Capacity',
      value: '78 · Orange',
      tone: 'warning',
      detail: 'Department capacity score 78/100',
    },
  ],
};

describe('wallDisplayMonitorPrivacyModel', () => {
  it('normalizes monitor privacy values', () => {
    expect(normalizeWallDisplayMonitorPrivacy('restricted')).toBe(
      WALL_DISPLAY_MONITOR_PRIVACY.restricted,
    );
    expect(normalizeWallDisplayMonitorPrivacy('unknown')).toBe(
      WALL_DISPLAY_MONITOR_PRIVACY.operational,
    );
  });

  it('leaves operational privacy snapshots unchanged', () => {
    expect(applyWallDisplayMonitorPrivacy(baseSnapshot, 'operational')).toEqual(baseSnapshot);
  });

  it('redacts timing detail under restricted privacy', () => {
    const snapshot = applyWallDisplayMonitorPrivacy(baseSnapshot, 'restricted');
    expect(snapshot.metrics.find((metric) => metric.id === 'ems-inbound')?.detail).toContain(
      'no unit identifiers',
    );
    expect(snapshot.summaryLine).not.toContain('Next arrival');
  });

  it('buckets longest wait under minimal privacy', () => {
    const snapshot = applyWallDisplayMonitorPrivacy(baseSnapshot, 'minimal');
    expect(snapshot.metrics.find((metric) => metric.id === 'longest-wait')?.value).toBe('1–2 hr');
    expect(snapshot.metrics.find((metric) => metric.id === 'capacity-status')?.value).toBe('Orange');
  });

  it('requires central-node redaction for restricted and minimal read-only whiteboard privacy', () => {
    expect(
      shouldRedactCentralNodeForMonitorPrivacy(
        CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
        'minimal',
      ),
    ).toBe(true);
    expect(
      shouldRedactCentralNodeForMonitorPrivacy(
        CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
        'restricted',
      ),
    ).toBe(true);
    expect(
      shouldRedactCentralNodeForMonitorPrivacy(
        CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
        'operational',
      ),
    ).toBe(false);
    expect(
      shouldRedactCentralNodeForMonitorPrivacy(CARE_DROID_SCREEN_MODES.chargeNurse, 'minimal'),
    ).toBe(false);
  });
});
