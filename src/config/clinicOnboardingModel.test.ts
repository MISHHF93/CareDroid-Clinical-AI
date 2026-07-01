import { describe, expect, it } from 'vitest';
import {
  CLINIC_ONBOARDING_STEP_IDS,
  auditClinicOnboardingExposure,
  buildClinicOnboardingDefaults,
  simulateClinicOnboarding,
} from './clinicOnboardingModel';

describe('clinicOnboardingModel', () => {
  it('builds clinic defaults for staff, queues, thresholds, alerts, and roles', () => {
    const defaults = buildClinicOnboardingDefaults({
      organizationName: 'Riverside Walk-In Clinic',
    });

    expect(defaults.staff.seedRoster.length).toBeGreaterThan(0);
    expect(defaults.queues.enabledQueueIds).toContain('triage-queue');
    expect(defaults.thresholds.waitWarningMinutes).toBe(30);
    expect(defaults.alertRules.longWait.enabled).toBe(true);
    expect(defaults.roles.defaultRoleProfileId).toBe('nurse');
  });

  it('simulates provisioned clinic onboarding with reduced friction', () => {
    const report = simulateClinicOnboarding();
    expect(report.organization.organizationType).toBe('clinic');
    expect(report.summary.completeSteps).toBeGreaterThanOrEqual(4);
    expect(report.steps.find((step) => step.id === CLINIC_ONBOARDING_STEP_IDS.THRESHOLDS)?.status).toBe(
      'complete',
    );
  });

  it('flags friction when emergency OS is not provisioned', () => {
    const report = simulateClinicOnboarding({ provisioned: false });
    expect(report.summary.completeSteps).toBeLessThan(3);
    expect(report.frictionPoints.length).toBeGreaterThan(0);
  });

  it('documents post-wizard routes', () => {
    const exposure = auditClinicOnboardingExposure();
    expect(exposure.wizardRoute).toBe('/onboarding');
    expect(exposure.provisionedDomains).toContain('thresholds');
  });
});
