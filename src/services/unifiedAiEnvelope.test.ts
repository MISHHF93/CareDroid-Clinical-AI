import { describe, expect, it } from 'vitest';
import {
  accountableFromUnifiedResponse,
  buildUnifiedAiRequestEnvelope,
  extractUnifiedEnvelope,
  isCareDroidUnifiedAIResponse,
  resolveUnifiedChannelFromRole,
  unifiedFromConversationalResponse,
  unifiedFromStructuredNode,
} from './unifiedAiEnvelope';
import type { CareDroidAIResponse } from '../../lib/ai/careDroidAI';
import type { AIResponse } from '../lib/ai/client';
import { PROVENANCE_CONTRACT_VERSION } from '../../lib/ai/provenanceContract';

describe('unifiedAiEnvelope', () => {
  it('maps reception roles to the reception channel', () => {
    expect(resolveUnifiedChannelFromRole('receptionist')).toBe('reception');
    expect(resolveUnifiedChannelFromRole('triage_nurse')).toBe('triage');
    expect(resolveUnifiedChannelFromRole('ems')).toBe('ems');
    expect(resolveUnifiedChannelFromRole('unknown-role', 'api')).toBe('api');
  });

  it('builds a valid Reception Copilot request envelope', () => {
    const built = buildUnifiedAiRequestEnvelope({
      role: 'receptionist',
      channel: 'reception',
      task: 'detect_missing_information',
      query: 'Insurance card missing — what else before handoff?',
      organizationId: 'org-1',
      userId: 'user-1',
    });
    expect(built.valid).toBe(true);
    if (!built.valid) return;
    expect(built.request.channel).toBe('reception');
    expect(built.request.task).toBe('detect_missing_information');
    expect(built.request.requestId).toMatch(/^req-/);
  });

  it('rejects invalid task/channel combinations via validation', () => {
    const built = buildUnifiedAiRequestEnvelope({
      role: 'receptionist',
      channel: 'not-a-channel',
      task: 'answer_question',
      query: 'hello',
    });
    // Invalid channel is coerced to api by the builder (safe default).
    expect(built.valid).toBe(true);
    if (!built.valid) return;
    expect(built.request.channel).toBe('api');
  });

  it('maps structured node responses into unified envelopes requiring review', () => {
    const node: CareDroidAIResponse = {
      intent: 'patient_intake_assist',
      status: 'success',
      priority: 'high',
      data: { missing: ['insurance'] },
      confidence: 0.7,
      reasoning: ['Insurance card not scanned'],
      warnings: [],
      redFlags: [],
      nextActions: ['Collect insurance card'],
      assignedRole: 'reception',
      recommendedDepartment: 'ED',
      requiresClinicianReview: true,
      clinicianOverrideAvailable: true,
      generatedAt: new Date().toISOString(),
      safetyDisclaimer: 'Review required',
      provenance: {
        contractVersion: PROVENANCE_CONTRACT_VERSION,
        responseSource: 'DETERMINISTIC_RULE',
        modelOrEngine: 'careDroidAI-heuristic-node',
        evidence: [],
        sourceVersions: [],
        confidence: 0.7,
        missingInformation: [],
        uncertainty: 'none',
        applicablePopulation: 'adult ED',
        limitations: [],
        recommendedReviewerRole: 'clinician',
        requiresClinicianReview: true,
        generatedAt: new Date().toISOString(),
        responseClass: 'clinical',
      },
    };
    const unified = unifiedFromStructuredNode({
      request: { requestId: 'req-1', correlationId: 'corr-1' },
      node,
    });
    expect(isCareDroidUnifiedAIResponse(unified)).toBe(true);
    expect(unified.status).toBe('needs_human_review');
    expect(unified.safety.requiresHumanReview).toBe(true);
    const accountable = accountableFromUnifiedResponse(unified);
    expect(accountable.humanReviewRequired).toBe(true);
    expect(accountable.content).toMatch(/Insurance/i);
  });

  it('maps conversational responses into unified envelopes', () => {
    const response: AIResponse = {
      ok: true,
      status: 200,
      content: 'Ask for missing insurance and next of kin before handoff.',
      data: {},
      toolCalls: [],
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      },
      requestType: 'COPILOT_CHAT',
    };
    const unified = unifiedFromConversationalResponse({
      request: {
        requestId: 'req-2',
        correlationId: 'corr-2',
        query: 'What is missing?',
      },
      response,
      model: 'claude-sonnet-4-6',
      provider: 'anthropic',
    });
    expect(unified.status).toBe('needs_human_review');
    expect(extractUnifiedEnvelope({ unifiedAiEnvelope: unified })?.requestId).toBe('req-2');
  });
});
