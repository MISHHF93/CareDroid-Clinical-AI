import { describe, expect, it } from 'vitest';
import { resolveProfileAiCapabilities } from './profileAiCapabilities.config';
import { resolveUserProfileCopy } from './userProfileCopyModel';

describe('profileAiCapabilities.config', () => {
  it('surfaces triage and prediction modules for nurses', () => {
    const copy = resolveUserProfileCopy({ saasRole: 'nurse', emergencyRoleId: 'triage_nurse' });
    const capabilities = resolveProfileAiCapabilities(copy);

    expect(capabilities.some((item) => item.serviceId === 'triageSupport')).toBe(true);
    expect(capabilities.length).toBeGreaterThan(0);
    expect(capabilities.length).toBeLessThanOrEqual(6);
  });

  it('surfaces analytics modules for researcher profiles', () => {
    const copy = resolveUserProfileCopy({ saasRole: 'researcher' });
    const capabilities = resolveProfileAiCapabilities(copy);

    expect(capabilities.some((item) => item.serviceId === 'analyticsExplanation')).toBe(true);
  });
});