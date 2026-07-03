import { describe, expect, it } from 'vitest';
import {
  AI_CHIEF_MONITORING_DOMAINS,
  AI_CHIEF_ORCHESTRATION_CONTRACT,
  AI_CHIEF_SAFETY_STATEMENT,
  listAiChiefBackendEndpoints,
  listUnifiedAiCapabilities,
} from './aiChiefOrchestrationModel';

describe('aiChiefOrchestrationModel', () => {
  it('defines ten continuous monitoring domains', () => {
    expect(AI_CHIEF_MONITORING_DOMAINS).toHaveLength(10);
    expect(AI_CHIEF_MONITORING_DOMAINS.map((domain) => domain.id)).toEqual(
      expect.arrayContaining([
        'patient_flow',
        'department_capacity',
        'staffing',
        'bottlenecks',
        'alerts',
        'service_health',
        'ems_arrivals',
        'patient_prioritization',
        'operational_intelligence',
        'clinical_workflow',
      ]),
    );
  });

  it('requires human review and forbids replacing clinician judgement', () => {
    expect(AI_CHIEF_SAFETY_STATEMENT.humanReviewRequired).toBe(true);
    expect(AI_CHIEF_SAFETY_STATEMENT.advisoryOnly).toBe(true);
    expect(AI_CHIEF_SAFETY_STATEMENT.replacesClinicianJudgment).toBe(false);
  });

  it('maps unified AI node capabilities and backend endpoints', () => {
    expect(listUnifiedAiCapabilities().length).toBeGreaterThanOrEqual(17);
    expect(listAiChiefBackendEndpoints()).toEqual(
      expect.arrayContaining(['/api/ai/node', '/api/emergency/operational-intelligence/snapshot']),
    );
  });

  it('publishes orchestration contract metadata', () => {
    expect(AI_CHIEF_ORCHESTRATION_CONTRACT.continuousMonitoring).toBe(true);
    expect(AI_CHIEF_ORCHESTRATION_CONTRACT.monitoringDomainCount).toBe(10);
    expect(AI_CHIEF_ORCHESTRATION_CONTRACT.capabilityCount).toBeGreaterThanOrEqual(17);
  });
});