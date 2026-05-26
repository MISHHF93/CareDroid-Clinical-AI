import {
  EmergencySeverity,
  IntentClassification,
  PrimaryIntent,
} from '../../medical-control-plane/intent-classifier/dto/intent-classification.dto';
import { AiRunEnvelope } from './ai-foundation.types';
import { AiRoutingEngineService } from './ai-routing-engine.service';

function createEnvelope(overrides: Partial<AiRunEnvelope> = {}): AiRunEnvelope {
  return {
    runId: 'run-1',
    capabilityId: 'clinical-chat',
    userId: 'user-1',
    input: {
      message: 'Patient has chest pain and elevated troponin.',
    },
    policy: {
      phiAccessed: false,
      requiresHumanReview: true,
      allowedTools: [],
    },
    trace: {
      sourceSurface: 'assistant-chat',
      startedAt: '2026-05-25T00:00:00.000Z',
    },
    ...overrides,
  };
}

function createClassification(overrides: Partial<IntentClassification> = {}): IntentClassification {
  return {
    primaryIntent: PrimaryIntent.MEDICAL_REFERENCE,
    confidence: 0.82,
    method: 'keyword',
    extractedParameters: {},
    isEmergency: false,
    emergencyKeywords: [],
    matchedPatterns: [],
    classifiedAt: new Date('2026-05-25T00:00:00.000Z'),
    ...overrides,
  };
}

describe('AiRoutingEngineService', () => {
  const service = new AiRoutingEngineService();

  it('preempts normal routing with the emergency expert', () => {
    const plan = service.createRoutePlan(
      createEnvelope({
        input: { message: 'Patient has chest pain, shock, and respiratory distress.' },
      }),
      createClassification({
        primaryIntent: PrimaryIntent.EMERGENCY,
        confidence: 0.9,
        isEmergency: true,
        emergencySeverity: EmergencySeverity.CRITICAL,
        emergencyKeywords: [
          {
            keyword: 'shock',
            category: 'hemodynamic',
            severity: EmergencySeverity.CRITICAL,
          },
        ],
      }),
    );

    expect(plan.selectedExpert).toBe('emergency');
    expect(plan.selectedExperts[0]).toMatchObject({
      expertId: 'emergency',
      role: 'primary',
    });
    expect(plan.safetyPlan.emergencyEscalation).toBe(true);
    expect(plan.costPlan.costReductionApplied).toContain('lightweight_router');
    expect(plan.routeScore).toBeGreaterThan(1);
  });

  it('routes cardiology requests and calculates score from confidence, relevance, and cost', () => {
    const plan = service.createRoutePlan(
      createEnvelope({
        input: { message: 'Review troponin trend and ECG for ACS risk.' },
      }),
      createClassification({
        primaryIntent: PrimaryIntent.MEDICAL_REFERENCE,
        confidence: 0.85,
      }),
    );

    const primary = plan.selectedExperts[0];
    expect(primary.expertId).toBe('cardiology');
    expect(primary.score).toBeCloseTo(
      (primary.confidence * primary.relevance) / primary.estimatedCost,
      2,
    );
    expect(plan.retrievalPolicy).toBe('guideline');
  });

  it('keeps backend executor IDs limited to registered executor tools', () => {
    const plan = service.createRoutePlan(
      createEnvelope({
        policy: {
          phiAccessed: false,
          requiresHumanReview: true,
          allowedTools: ['drug-interactions'],
        },
      }),
      createClassification({
        primaryIntent: PrimaryIntent.CLINICAL_TOOL,
        toolId: 'drug-interactions',
        confidence: 0.88,
      }),
    );

    expect(plan.toolPlan.allowedToolIds).toEqual(['drug-interactions']);
    expect(plan.toolPlan.backendExecutorIds).toEqual(['drug-interactions']);
    expect(plan.toolPlan.requiredHumanConfirmation).toBe(true);
  });

  it('selects operational experts for fleet and map surfaces', () => {
    const fleetPlan = service.createRoutePlan(
      createEnvelope({
        capabilityId: 'fleet-command',
        input: { message: 'Show dispatch and fleet utilization constraints.' },
        trace: {
          sourceSurface: 'fleet',
          startedAt: '2026-05-25T00:00:00.000Z',
        },
      }),
      createClassification({ primaryIntent: PrimaryIntent.ADMINISTRATIVE, confidence: 0.74 }),
    );

    expect(fleetPlan.selectedExpert).toBe('fleet');
    expect(fleetPlan.retrievalPolicy).toBe('operational');
  });
});
