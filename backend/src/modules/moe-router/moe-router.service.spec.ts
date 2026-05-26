import {
  EmergencySeverity,
  IntentClassification,
  PrimaryIntent,
} from '../medical-control-plane/intent-classifier/dto/intent-classification.dto';
import { ExpertSelectorService } from './expert-selector.service';
import { MoERouterService } from './moe-router.service';
import { GatewayRunEnvelope } from './moe-router.types';

function createEnvelope(overrides: Partial<GatewayRunEnvelope> = {}): GatewayRunEnvelope {
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

describe('MoERouterService', () => {
  const service = new MoERouterService(new ExpertSelectorService());

  it('preempts routing with the emergency expert', () => {
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
    expect(plan.routingMode).toBe('multi_expert');
    expect(plan.safetyPlan.emergencyEscalation).toBe(true);
    expect(plan.routeScore).toBeGreaterThan(1);
  });

  it('uses the requested confidence-relevance-cost score formula', () => {
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

  it('routes multi-domain clinical requests to multiple experts', () => {
    const plan = service.createRoutePlan(
      createEnvelope({
        input: {
          message: 'Patient has chest pain, dyspnea, rising creatinine, and seizure-like activity.',
        },
      }),
      createClassification({
        primaryIntent: PrimaryIntent.MEDICAL_REFERENCE,
        confidence: 0.84,
      }),
    );

    expect(plan.routingMode).toBe('multi_expert');
    expect(plan.selectedExperts.map((expert) => expert.expertId)).toEqual(
      expect.arrayContaining(['cardiology', 'pulmonology']),
    );
    expect(plan.selectedExperts.length).toBeGreaterThan(1);
  });

  it('keeps simple general requests on a lightweight route', () => {
    const plan = service.createRoutePlan(
      createEnvelope({ input: { message: 'What can you help me with?' } }),
      createClassification({ primaryIntent: PrimaryIntent.GENERAL_QUERY, confidence: 0.72 }),
    );

    expect(plan.routingMode).toBe('lightweight');
    expect(plan.modelPlan.expertModel).toBe('none');
    expect(plan.costPlan.costReductionApplied).toContain('lightweight_handler');
  });

  it('falls back when no expert clears the signal threshold', () => {
    const plan = service.createRoutePlan(
      createEnvelope({
        input: { message: 'Explain a generic policy with no clinical detail.' },
      }),
      createClassification({ primaryIntent: PrimaryIntent.MEDICAL_REFERENCE, confidence: 0.4 }),
    );

    expect(plan.fallbackApplied).toBe(true);
    expect(plan.selectedExpert).toBe('documentation');
  });
});
