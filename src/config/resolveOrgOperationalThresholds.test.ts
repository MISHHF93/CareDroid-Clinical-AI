import { describe, expect, it } from 'vitest';
import { getOrgEmergencyBranding } from './emergencyOsBranding.config';
import { resolveOrgOperationalThresholds } from './resolveOrgOperationalThresholds';

describe('resolveOrgOperationalThresholds', () => {
  it('merges org wait thresholds over defaults', () => {
    const resolved = resolveOrgOperationalThresholds({
      thresholds: {
        waitWarningMinutes: 25,
        waitCriticalMinutes: 40,
      },
    });
    expect(resolved.waitWarningMinutes).toBe(25);
    expect(resolved.waitCriticalMinutes).toBe(40);
    expect(resolved.reassessmentIntervals.P2).toBeGreaterThan(0);
  });
});

describe('getOrgEmergencyBranding', () => {
  it('overrides copilot name from org settings', () => {
    const branding = getOrgEmergencyBranding({
      branding: { copilotName: 'Riverside ED Assistant' },
    });
    expect(branding.copilotName).toBe('Riverside ED Assistant');
    expect(branding.safetyLine).toContain('Human review');
  });
});
