import { describe, expect, it } from 'vitest';
import { evaluateFeatureAccess } from './featureFlagService';

describe('FeatureFlagService entitlements', () => {
  it('allows admission prediction for entitled professional tenants', () => {
    const docArtifacts = evaluateFeatureAccess('patient_document_artifacts', {
      organization: { id: 'org-1', subscriptionPlan: 'professional' },
      role: 'physician',
      entitledPackIds: ['emergency-department-pack'],
    });
    expect(docArtifacts.enabled).toBe(true);
    expect(docArtifacts.reason).toBe('allowed');

    const access = evaluateFeatureAccess('admission_prediction', {
      organization: { id: 'org-1', subscriptionPlan: 'professional' },
      role: 'physician',
      entitledPackIds: ['emergency-department-pack', 'analytics-pack'],
    });
    expect(access.enabled).toBe(true);
    expect(access.reason).toBe('allowed');
  });

  it('denies copilot for roles without permission', () => {
    const access = evaluateFeatureAccess('ed_copilot', {
      organization: { id: 'org-1', subscriptionPlan: 'professional' },
      role: 'student',
      entitledPackIds: ['emergency-department-pack'],
    });
    expect(access.enabled).toBe(false);
    expect(access.reason).toBe('role-denied');
  });

  it('denies analytics when required pack is missing', () => {
    const access = evaluateFeatureAccess('emergency_analytics', {
      organization: { id: 'org-1', subscriptionPlan: 'professional' },
      role: 'charge_nurse',
      entitledPackIds: ['emergency-department-pack'],
    });
    expect(access.enabled).toBe(false);
    expect(access.reason).toBe('pack-required');
  });

  it('allows native AI reception features for registration staff', () => {
    const triageRules = evaluateFeatureAccess('nlp_triage_expert_system', {
      organization: { id: 'org-1', subscriptionPlan: 'professional' },
      role: 'registration_clerk',
      entitledPackIds: ['emergency-department-pack'],
    });
    expect(triageRules.enabled).toBe(true);

    const voiceInterview = evaluateFeatureAccess('voice_interview_assistant', {
      organization: { id: 'org-1', subscriptionPlan: 'professional' },
      role: 'registration_clerk',
      entitledPackIds: ['emergency-department-pack'],
    });
    expect(voiceInterview.enabled).toBe(true);
  });

  it('allows clinical acuity dashboard for entitled charge nurses', () => {
    const access = evaluateFeatureAccess('clinical_acuity_dashboard', {
      organization: { id: 'org-1', subscriptionPlan: 'professional' },
      role: 'charge_nurse',
      entitledPackIds: ['emergency-department-pack', 'analytics-pack'],
    });
    expect(access.enabled).toBe(true);
    expect(access.reason).toBe('allowed');
  });
});
