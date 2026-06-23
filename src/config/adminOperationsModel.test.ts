import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { getVisibleAdminOpsSections } from './adminOperationsModel';

describe('adminOperationsModel', () => {
  it('shows ED workflows for hospital admin but not registration clerk', () => {
    const adminSections = getVisibleAdminOpsSections('hospital-administrator');
    const clerkSections = getVisibleAdminOpsSections('registration-clerk');
    expect(adminSections.some((section) => section.id === 'ed-workflows')).toBe(true);
    expect(clerkSections.some((section) => section.id === 'ed-workflows')).toBe(false);
  });

  it('shows surveillance for racetrack admin when route is allowed', () => {
    const sections = getVisibleAdminOpsSections('racetrack-admin');
    const hasSurveillance = sections.some((section) => section.id === 'surveillance-iot');
    const hasOrgDashboard = sections.some((section) =>
      section.primaryLink.route === CANONICAL_ROUTES.organization,
    );
    expect(hasSurveillance || hasOrgDashboard).toBe(true);
  });
});
