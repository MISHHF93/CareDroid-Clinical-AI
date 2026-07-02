import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const transportCareDroidAINode = vi.hoisted(() => vi.fn());
const callAI = vi.hoisted(() => vi.fn());

vi.mock('./careDroidAiApi', () => ({
  transportCareDroidAINode,
  CARE_DROID_AI_NODE_PATH: '/api/ai/node',
}));

vi.mock('../lib/ai/client', () => ({
  callAI,
}));

import {
  applyAlertRoutingToResponse,
  enrichStructuredRequest,
  inferAlertScenario,
  requestAiChiefConversational,
  requestAiChiefCopilotQuery,
  requestAiChiefStructured,
  resolveAIChiefDomain,
} from './aiChiefOrchestrator';
import type { CareDroidAIResponse } from '../../lib/ai/careDroidAI';

const baseResponse: CareDroidAIResponse = {
  intent: 'critical_alert_assessment',
  status: 'success',
  priority: 'high',
  data: { action: 'Acknowledge alert' },
  confidence: 0.82,
  reasoning: ['Chest pain reported'],
  warnings: [],
  redFlags: ['Chest pain reported'],
  nextActions: ['Assign owner'],
  assignedRole: 'triage_nurse',
  recommendedDepartment: 'Cardiology',
  requiresClinicianReview: true,
  clinicianOverrideAvailable: true,
  generatedAt: new Date().toISOString(),
  safetyDisclaimer: 'Decision support only',
};

describe('aiChiefOrchestrator', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    transportCareDroidAINode.mockReset();
    callAI.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps intents to AI Chief domains', () => {
    expect(resolveAIChiefDomain('triage_recommendation')).toBe('triage');
    expect(resolveAIChiefDomain('service_bottleneck_analysis')).toBe('bottlenecks');
    expect(resolveAIChiefDomain('handoff_summary')).toBe('handoffs');
  });

  it('infers alert scenarios from clinical input', () => {
    expect(inferAlertScenario({ chiefComplaint: 'Chest pain radiating to jaw' })).toBe(
      'critical_chest_pain',
    );
    expect(inferAlertScenario({ complaint: 'Possible stroke with facial droop' })).toBe('stroke_alert');
    expect(inferAlertScenario({}, 'ems_prearrival_risk_summary')).toBe('ems_incoming');
  });

  it('enriches bottleneck intents with registry snapshot fields', () => {
    const prepared = enrichStructuredRequest({
      intent: 'service_bottleneck_analysis',
      input: { department: 'ED' },
    });

    expect(prepared.input.activeBottlenecks).toBeDefined();
    expect(prepared.input.threeMinuteRiskProjection).toBeDefined();
    expect(prepared.context?.orchestratorVersion).toBeTruthy();
    expect(prepared.context?.domain).toBe('bottlenecks');
  });

  it('applies AI Chief alert routing to structured responses', () => {
    const routed = applyAlertRoutingToResponse(baseResponse, 'critical_chest_pain');
    expect(routed.visibleToRoles).toContain('triage_nurse');
    expect(routed.escalationRole).toBe('emergency_physician');
    expect(routed.suggestedOwnerRole).toBe('triage_nurse');
  });

  it('routes structured requests through transport and audit', async () => {
    transportCareDroidAINode.mockResolvedValue(baseResponse);

    const response = await requestAiChiefStructured({
      intent: 'critical_alert_assessment',
      input: { chiefComplaint: 'Chest pain' },
      alertScenario: 'critical_chest_pain',
    });

    expect(transportCareDroidAINode).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'critical_alert_assessment',
        input: expect.objectContaining({ chiefComplaint: 'Chest pain' }),
      }),
      {},
    );
    expect(response.escalationRole).toBe('emergency_physician');
    expect(console.info).toHaveBeenCalledWith('[AI_AUDIT]', expect.any(Object));
  });

  it('routes conversational copilot queries through unified AI client', async () => {
    callAI.mockResolvedValue({
      ok: true,
      status: 200,
      content: 'Review triage queue and acknowledge critical alerts.',
      data: {},
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      requestType: 'COPILOT_CHAT',
    });

    const result = await requestAiChiefCopilotQuery('What should charge nurse do now?', {
      userRole: 'charge_nurse',
    });

    expect(callAI).toHaveBeenCalledWith(
      expect.objectContaining({
        requestType: 'COPILOT_CHAT',
        message: 'What should charge nurse do now?',
        context: expect.objectContaining({
          aiChief: expect.objectContaining({ domain: 'copilot_chat' }),
          unifiedAiNode: expect.objectContaining({
            nodeId: 'CareDroidUnifiedAINode',
            route: '/api/ai/node',
          }),
        }),
      }),
      undefined,
    );
    expect(result.response).toContain('Review triage queue');
  });
});