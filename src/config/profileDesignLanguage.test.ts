import { describe, expect, it } from 'vitest';
import {
  PROFILE_SHELL_SECTIONS,
  getProfileCopilotWelcomeMessage,
  profileHasCopilotCapture,
  resolveCopilotChromeLabels,
  resolveProfileIdentityCard,
  resolveProfileShellSection,
} from './profileDesignLanguage.config';
import { resolveUserProfileCopy as resolveCopy } from './userProfileCopyModel';

describe('profileDesignLanguage.config', () => {
  it('defines consistent profile shell sections and nav labels', () => {
    expect(PROFILE_SHELL_SECTIONS.length).toBe(7);
    expect(resolveProfileShellSection('overview').pageTitle).toBe('Profile overview');
    expect(resolveProfileShellSection('settings').label).toBe('Identity');
  });

  it('uses workspace eyebrow on identity cards per role', () => {
    const nurseCopy = resolveCopy({
      saasRole: 'nurse',
      emergencyRoleId: 'triage_nurse',
    });
    const pharmacistCopy = resolveCopy({ saasRole: 'pharmacist' });

    expect(resolveProfileIdentityCard(nurseCopy).eyebrow).toBe('Triage lane');
    expect(resolveProfileIdentityCard(pharmacistCopy).eyebrow).toBe('Read-only display');
  });

  it('unifies copilot chrome labels while varying welcome intro by role', () => {
    const physicianCopy = resolveCopy({ saasRole: 'emergency-physician' });
    const clerkCopy = resolveCopy({ saasRole: 'registration-clerk' });

    const physicianLabels = resolveCopilotChromeLabels(physicianCopy);
    const clerkLabels = resolveCopilotChromeLabels(clerkCopy);

    expect(physicianLabels.productName).toBe('CareDroid Copilot');
    expect(clerkLabels.openAriaLabel).toBe('Open CareDroid Copilot');
    expect(clerkLabels.placeholder).toBe('Ask CareDroid Copilot...');
    expect(physicianLabels.welcomeFull).toContain('Capture differential');
    expect(clerkLabels.welcomeFull).toContain('arrival details');
  });

  it('detects copilot capture capability from primary functions', () => {
    const physicianCopy = resolveCopy({ saasRole: 'emergency-physician' });
    const pharmacistCopy = resolveCopy({ saasRole: 'pharmacist' });

    expect(profileHasCopilotCapture(physicianCopy)).toBe(true);
    expect(profileHasCopilotCapture(pharmacistCopy)).toBe(false);
  });

  it('formats compact welcome with safety disclaimer', () => {
    const copy = resolveCopy({ saasRole: 'nurse' });
    const message = getProfileCopilotWelcomeMessage(true, copy);

    expect(message).toContain('triage findings');
    expect(message).toContain('Human review');
  });
});