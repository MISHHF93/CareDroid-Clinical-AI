import { describe, expect, it } from 'vitest';
import { CARE_DROID_SCREEN_MODES } from '../central-node/careDroidCentralNode';
import { resolveScreenModeCapabilities } from './useScreenModeCapabilities';

describe('useScreenModeCapabilities', () => {
  it('hides command-layer chrome on registration screen, but still shows its own header KPI pair', () => {
    const capabilities = resolveScreenModeCapabilities(CARE_DROID_SCREEN_MODES.reception);

    expect(capabilities.isRegistrationScreen).toBe(true);
    expect(capabilities.showCentralNodeBadge).toBe(false);
    // Reception shows its own operational strip (Triage queue / Longest wait)
    // in the header rather than going pill-less -- everything else in this
    // block (the central-node badge, reassess action, EMS overlay, capacity/
    // reassessment engines) stays suppressed, unchanged.
    expect(capabilities.showOperationalStrip).toBe(true);
    expect(capabilities.showReassessAction).toBe(false);
    expect(capabilities.showEmsCriticalOverlay).toBe(false);
    expect(capabilities.showCapacityEngine).toBe(false);
    expect(capabilities.showReassessmentEngine).toBe(false);
    expect(capabilities.productLabel).toBe('Arrival Dashboard');
    expect(capabilities.visibleWidgets).toContain('ems-pre-arrival');
  });

  it('keeps command-layer chrome on charge nurse screen', () => {
    const capabilities = resolveScreenModeCapabilities(CARE_DROID_SCREEN_MODES.chargeNurse);

    expect(capabilities.showOperationalStrip).toBe(true);
    expect(capabilities.showReassessAction).toBe(true);
    expect(capabilities.showEmsCriticalOverlay).toBe(true);
    expect(capabilities.productLabel).toBe('CareDroid');
  });
});
