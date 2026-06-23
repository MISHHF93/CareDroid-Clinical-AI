import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  isAdminSaasRole,
  resolvePlatformLanding,
} from './platformEntryModel';

describe('platformEntryModel', () => {
  it('sends open-access users to the platform entry hub', () => {
    expect(
      resolvePlatformLanding({ authMode: 'open-access', saasRole: 'student' }),
    ).toBe(CANONICAL_ROUTES.platformStart);
  });

  it('sends admins to the admin console after sign-in', () => {
    expect(
      resolvePlatformLanding({
        authMode: 'authenticated',
        saasRole: 'hospital-administrator',
        onboardingStatus: 'complete',
      }),
    ).toBe(CANONICAL_ROUTES.adminOperations);
  });

  it('sends incomplete onboarding to welcome', () => {
    expect(
      resolvePlatformLanding({
        authMode: 'authenticated',
        saasRole: 'nurse',
        onboardingStatus: 'pending',
      }),
    ).toBe(CANONICAL_ROUTES.welcome);
  });

  it('detects admin SaaS roles', () => {
    expect(isAdminSaasRole('hospital-administrator')).toBe(true);
    expect(isAdminSaasRole('nurse')).toBe(false);
  });
});
