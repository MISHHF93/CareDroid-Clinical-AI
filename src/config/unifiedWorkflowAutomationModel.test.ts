import { describe, expect, it } from 'vitest';
import {
  UNIFIED_WORKFLOW_AUTOMATION_CONTRACT,
  UNIFIED_WORKFLOW_SAFETY_STATEMENT,
  WORKFLOW_AUTOMATION_DOMAINS,
  WORKFLOW_AUTOMATION_TRIGGER_EVENTS,
  isWorkflowAutomationTriggerEvent,
  listWorkflowAutomationBackendEndpoints,
  listWorkflowAutomationDomains,
  resolvePrimaryDomainForAutomationCategory,
} from './unifiedWorkflowAutomationModel';

describe('unifiedWorkflowAutomationModel', () => {
  it('defines eleven consolidated workflow domains', () => {
    expect(WORKFLOW_AUTOMATION_DOMAINS).toHaveLength(11);
    expect(listWorkflowAutomationDomains().map((domain) => domain.id)).toEqual(
      expect.arrayContaining([
        'reception',
        'intake',
        'triage',
        'patient_routing',
        'notifications',
        'documentation',
        'handoffs',
        'staff_assignments',
        'analytics',
        'reporting',
        'ai_recommendations',
      ]),
    );
  });

  it('maps administrative automation categories to primary workflow domains', () => {
    expect(resolvePrimaryDomainForAutomationCategory('patient_routing')).toBe('patient_routing');
    expect(resolvePrimaryDomainForAutomationCategory('documentation_handoff')).toBe(
      'documentation',
    );
    expect(resolvePrimaryDomainForAutomationCategory('ai_patient_summary')).toBe(
      'ai_recommendations',
    );
    expect(resolvePrimaryDomainForAutomationCategory('staff_assignment')).toBe('staff_assignments');
  });

  it('requires human oversight and forbids replacing clinician judgement', () => {
    expect(UNIFIED_WORKFLOW_SAFETY_STATEMENT.humanReviewRequired).toBe(true);
    expect(UNIFIED_WORKFLOW_SAFETY_STATEMENT.advisoryOnly).toBe(true);
    expect(UNIFIED_WORKFLOW_SAFETY_STATEMENT.replacesClinicianJudgment).toBe(false);
  });

  it('lists backend events that drive workflow refresh', () => {
    expect(WORKFLOW_AUTOMATION_TRIGGER_EVENTS.length).toBeGreaterThanOrEqual(15);
    expect(isWorkflowAutomationTriggerEvent('journey_state_changed')).toBe(true);
    expect(isWorkflowAutomationTriggerEvent('workflow_orchestration_updated')).toBe(true);
    expect(isWorkflowAutomationTriggerEvent('unknown_event')).toBe(false);
  });

  it('publishes automation contract metadata and backend endpoints', () => {
    expect(UNIFIED_WORKFLOW_AUTOMATION_CONTRACT.domainCount).toBe(11);
    expect(UNIFIED_WORKFLOW_AUTOMATION_CONTRACT.eventDriven).toBe(true);
    expect(listWorkflowAutomationBackendEndpoints()).toEqual(
      expect.arrayContaining([
        '/api/emergency/workflow-orchestration',
        '/api/emergency/patient-flow',
      ]),
    );
  });
});
