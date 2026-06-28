import { describe, it, expect } from 'vitest';
import {
  AI_CHIEF_ROUTING,
  getAiRecommendationRoute,
  isAlertVisibleToRole,
  getEscalationRoleForScenario,
  getSuggestedOwnerForScenario,
  getVisibleScenariosForRole,
  filterAiRecommendationsByRole,
  filterAiRecommendationsByProfile,
  getCanonicalAiRecommendationRoute,
} from './aiChiefRouting';
import { getDemoUserById } from './demoUsers';

describe('AI_CHIEF_ROUTING', () => {
  it('every scenario has visibleToRoles, suggestedOwnerRole, and escalationRole', () => {
    for (const [, route] of Object.entries(AI_CHIEF_ROUTING)) {
      expect(route.visibleToRoles.length).toBeGreaterThan(0);
      expect(route.suggestedOwnerRole).toBeTruthy();
      expect(route.escalationRole).toBeTruthy();
    }
  });

  it('critical_chest_pain is visible to triage_nurse and emergency_physician', () => {
    expect(isAlertVisibleToRole('critical_chest_pain', 'triage_nurse')).toBe(true);
    expect(isAlertVisibleToRole('critical_chest_pain', 'emergency_physician')).toBe(true);
  });

  it('critical_chest_pain is not visible to it_admin or demo_observer', () => {
    expect(isAlertVisibleToRole('critical_chest_pain', 'it_admin')).toBe(false);
    expect(isAlertVisibleToRole('critical_chest_pain', 'demo_observer')).toBe(false);
  });

  it('bed_capacity_breach is visible to patient_flow_coordinator and ed_director', () => {
    expect(isAlertVisibleToRole('bed_capacity_breach', 'patient_flow_coordinator')).toBe(true);
    expect(isAlertVisibleToRole('bed_capacity_breach', 'ed_director')).toBe(true);
  });

  it('bed_capacity_breach is not visible to triage_nurse', () => {
    expect(isAlertVisibleToRole('bed_capacity_breach', 'triage_nurse')).toBe(false);
  });

  it('security_incident is visible only to security_officer and ops leadership', () => {
    expect(isAlertVisibleToRole('security_incident', 'security_officer')).toBe(true);
    expect(isAlertVisibleToRole('security_incident', 'triage_nurse')).toBe(false);
    expect(isAlertVisibleToRole('security_incident', 'lab_technician')).toBe(false);
  });

  it('medication_interaction escalates to emergency_physician', () => {
    expect(getEscalationRoleForScenario('medication_interaction')).toBe('emergency_physician');
  });

  it('critical_chest_pain suggests triage_nurse as owner', () => {
    expect(getSuggestedOwnerForScenario('critical_chest_pain')).toBe('triage_nurse');
  });

  it('all clinical scenarios require clinician review', () => {
    const clinicalScenarios = [
      'critical_chest_pain', 'stroke_alert', 'sepsis_alert', 'pediatric_emergency',
      'trauma_activation', 'mental_health_crisis', 'medication_interaction', 'lab_critical_value',
    ] as const;
    for (const scenario of clinicalScenarios) {
      expect(getAiRecommendationRoute(scenario).requiresClinicianReview).toBe(true);
    }
  });
});

describe('getVisibleScenariosForRole', () => {
  it('emergency_physician sees multiple scenarios', () => {
    const scenarios = getVisibleScenariosForRole('emergency_physician');
    expect(scenarios.length).toBeGreaterThan(3);
    expect(scenarios).toContain('critical_chest_pain');
  });

  it('demo_observer sees no scenarios', () => {
    const scenarios = getVisibleScenariosForRole('demo_observer');
    expect(scenarios.length).toBe(0);
  });

  it('patient_flow_coordinator sees bed_capacity_breach', () => {
    const scenarios = getVisibleScenariosForRole('patient_flow_coordinator');
    expect(scenarios).toContain('bed_capacity_breach');
  });
});

describe('filterAiRecommendationsByRole', () => {
  it('filters recommendations by role visibility', () => {
    const recommendations = [
      { scenario: 'critical_chest_pain' as const, text: 'Chest pain alert' },
      { scenario: 'bed_capacity_breach' as const, text: 'Capacity alert' },
      { scenario: 'security_incident' as const, text: 'Security alert' },
    ];

    const forTriage = filterAiRecommendationsByRole(recommendations, 'triage_nurse');
    expect(forTriage.some((r) => r.scenario === 'critical_chest_pain')).toBe(true);
    expect(forTriage.some((r) => r.scenario === 'bed_capacity_breach')).toBe(false);
    expect(forTriage.some((r) => r.scenario === 'security_incident')).toBe(false);
  });
});

describe('canonical AI Chief routing', () => {
  it('includes owner/site/department metadata for a compiled profile', () => {
    const profile = getDemoUserById('demo-sofia-alvarez');
    expect(profile).toBeTruthy();
    const route = getCanonicalAiRecommendationRoute('critical_chest_pain', profile);

    expect(route.ownerRole).toBe('triage_nurse');
    expect(route.owningDepartment).toBe(profile?.departmentId);
    expect(route.owningSite).toBe(profile?.hospitalSiteId);
    expect(route.visibleToUsers).toContain(profile?.id);
    expect(route.fallbackOwnerRole).toBe('charge_nurse');
  });

  it('filters by canonical profile and excludes read-only demo observers', () => {
    const physician = getDemoUserById('demo-maya-chen');
    const viewer = getDemoUserById('demo-viewer');
    const recommendations = [
      { scenario: 'critical_chest_pain' as const, text: 'Chest pain alert' },
      { scenario: 'bed_capacity_breach' as const, text: 'Capacity alert' },
    ];

    expect(filterAiRecommendationsByProfile(recommendations, physician!)).toHaveLength(1);
    expect(filterAiRecommendationsByProfile(recommendations, viewer!)).toHaveLength(0);
  });
});
