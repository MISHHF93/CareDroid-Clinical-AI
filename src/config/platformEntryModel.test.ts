import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  isAdminSaasRole,
  resolveAdminHomeRoute,
  resolveClinicalHomeRoute,
  resolvePlatformLanding,
} from './platformEntryModel';

describe('platformEntryModel', () => {
  it('sends students to their clinical home in open-access mode', () => {
    expect(resolvePlatformLanding({ saasRole: 'student' })).toBe(
      resolveClinicalHomeRoute('student'),
    );
  });

  it('sends admins to the admin console', () => {
    expect(
      resolvePlatformLanding({
        saasRole: 'hospital-administrator',
      }),
    ).toBe(CANONICAL_ROUTES.adminOperations);
  });

  it('honors safe return URLs', () => {
    expect(
      resolvePlatformLanding({
        saasRole: 'student',
        returnUrl: '/profile',
      }),
    ).toBe('/profile');
  });

  it('identifies admin SaaS roles', () => {
    expect(isAdminSaasRole('hospital-administrator')).toBe(true);
    expect(isAdminSaasRole('student')).toBe(false);
    expect(resolveAdminHomeRoute()).toBe(`${CANONICAL_ROUTES.adminOperations}/tenant`);
  });

  it('resolves a role with a curated hospital-role home route to exactly that route', () => {
    // triage_nurse's curated route (the pretriage queue) is distinct from
    // the generic ED whiteboard every fallback in the chain below it would
    // otherwise produce -- see hasExplicitHomeRoute()'s tests in
    // roleClusterNav.config.test.ts for the underlying precedence bug this
    // guards (getHomeRouteForRole() never returns falsy, so a naive `||`
    // chain past it is dead code).
    expect(resolveClinicalHomeRoute('triage_nurse')).toBe(
      '/emergency/queues?queue=pretriage',
    );
  });
});
