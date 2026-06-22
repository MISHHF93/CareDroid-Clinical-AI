import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  READ_ONLY_WHITEBOARD_METRIC_IDS,
  READ_ONLY_WHITEBOARD_SCREEN_WIDGETS,
  getReadOnlyWhiteboardPath,
  resolveReadOnlyWhiteboardScreenCapabilities,
} from './readOnlyWhiteboardScreenModel';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';

describe('readOnlyWhiteboardScreenModel', () => {
  it('builds read-only whiteboard landing path', () => {
    expect(getReadOnlyWhiteboardPath()).toBe(
      `${CANONICAL_ROUTES.emergencyWhiteboard}?display=readonly`,
    );
  });

  it('enables hallway operations widgets on READ_ONLY_WHITEBOARD', () => {
    const readOnly = resolveReadOnlyWhiteboardScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
      roleLabel: 'Read-only display',
    });

    expect(readOnly.isReadOnlyWhiteboardScreen).toBe(true);
    expect(readOnly.isKioskMode).toBe(true);
    expect(readOnly.showWaitingCount).toBe(true);
    expect(readOnly.showLongestWait).toBe(true);
    expect(readOnly.showTriagePending).toBe(true);
    expect(readOnly.showReassessmentsDue).toBe(true);
    expect(readOnly.showEmsInbound).toBe(true);
    expect(readOnly.showOffloadDelays).toBe(true);
    expect(readOnly.showBoarders).toBe(true);
    expect(readOnly.showReferralsPending).toBe(true);
    expect(readOnly.showCapacityStatus).toBe(true);
    expect(readOnly.visibleMetricIds).toEqual([...READ_ONLY_WHITEBOARD_METRIC_IDS]);
    expect(readOnly.visibleOperationalSurfaces).toHaveLength(9);
    expect(readOnly.defaultFocus).toBe(READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.waitingCount);
    expect(readOnly.defaultLandingRoute).toContain('display=readonly');
  });

  it('hides read-only whiteboard widgets outside READ_ONLY_WHITEBOARD', () => {
    const charge = resolveReadOnlyWhiteboardScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
      roleLabel: 'Charge Nurse',
    });

    expect(charge.isReadOnlyWhiteboardScreen).toBe(false);
    expect(charge.showWaitingCount).toBe(false);
    expect(charge.visibleMetricIds).toHaveLength(0);
  });
});
