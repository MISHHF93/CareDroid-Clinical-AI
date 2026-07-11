import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareDroidAIResponse } from '../../lib/ai/careDroidAI';
import type { AIResponse } from '../lib/ai/client';
import { CARE_DROID_UNIFIED_AI_NODE_ID } from '../config/careDroidUnifiedAiNode.config';

const requestAiChiefStructured = vi.hoisted(() => vi.fn());
const requestAiChiefConversational = vi.hoisted(() => vi.fn());
const requestAiChiefCopilotQuery = vi.hoisted(() => vi.fn());

vi.mock('./aiChiefOrchestrator', () => ({
  requestAiChiefStructured,
  requestAiChiefConversational,
  requestAiChiefCopilotQuery,
}));

import {
  invokeUnifiedAiConversational,
  invokeUnifiedAiCopilotQuery,
  invokeUnifiedAiHandoffBrief,
  invokeUnifiedAiRequest,
  invokeUnifiedAiStructured,
  invokeUnifiedAiStructuredByIntent,
} from './careDroidUnifiedAiNode';

describe('careDroidUnifiedAiNode service', () => {
  beforeEach(() => {
    requestAiChiefStructured.mockReset();
    requestAiChiefConversational.mockReset();
    requestAiChiefCopilotQuery.mockReset();
  });

  it('routes structured requests through AI Chief with unified node context', async () => {
    const response = { status: 'success' } as CareDroidAIResponse;
    requestAiChiefStructured.mockResolvedValue(response);

    const result = await invokeUnifiedAiStructured({
      intent: 'triage_recommendation',
      input: { complaint: 'chest pain' },
      capabilityId: 'triageSupport',
    });

    expect(result).toBe(response);
    expect(requestAiChiefStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'triage_recommendation',
        context: expect.objectContaining({
          unifiedAiNode: expect.objectContaining({
            nodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
          }),
          capabilityId: 'triageSupport',
        }),
      }),
      {},
    );
  });

  it('routes conversational requests through AI Chief with unified node context', async () => {
    const response = { ok: true, content: 'ok' } as AIResponse;
    requestAiChiefConversational.mockResolvedValue(response);

    const result = await invokeUnifiedAiConversational({
      requestType: 'COPILOT_QUERY' as any,
      message: 'queue status',
      capabilityId: 'copilot',
    } as unknown as Parameters<typeof invokeUnifiedAiConversational>[0]);

    expect(result).toBe(response);
    expect(requestAiChiefConversational).toHaveBeenCalledWith(
      expect.objectContaining({
        requestType: 'COPILOT_QUERY',
        context: expect.objectContaining({
          unifiedAiNode: expect.objectContaining({
            nodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
          }),
          capabilityId: 'copilot',
        }),
      }),
      undefined,
    );
  });

  it('binds structured intents to platform service capabilities', async () => {
    const response = { status: 'success' } as CareDroidAIResponse;
    requestAiChiefStructured.mockResolvedValue(response);

    await invokeUnifiedAiStructuredByIntent({
      intent: 'triage_recommendation',
      input: { complaint: 'fever' },
    });

    expect(requestAiChiefStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'triage_recommendation',
        context: expect.objectContaining({
          capabilityId: 'triageSupport',
        }),
      }),
      {},
    );
  });

  it('routes handoff briefs through smartHandover capability', async () => {
    const response = { ok: true, content: 'brief' } as AIResponse;
    requestAiChiefConversational.mockResolvedValue(response);

    await invokeUnifiedAiHandoffBrief({
      requestType: 'HANDOFF_BRIEF',
      systemPrompt: 'handoff',
      message: 'generate',
    });

    expect(requestAiChiefConversational).toHaveBeenCalledWith(
      expect.objectContaining({
        requestType: 'HANDOFF_BRIEF',
        context: expect.objectContaining({
          capabilityId: 'smartHandover',
        }),
      }),
      undefined,
    );
  });

  it('routes copilot queries through copilot capability', async () => {
    requestAiChiefCopilotQuery.mockResolvedValue({
      id: 'q-1',
      query: 'status',
      response: 'ok',
      safetyStatus: 'unknown',
      createdAt: '2026-07-01T00:00:00.000Z',
      raw: {},
    });

    await invokeUnifiedAiCopilotQuery('status', { userRole: 'charge_nurse' });

    expect(requestAiChiefCopilotQuery).toHaveBeenCalledWith(
      'status',
      expect.objectContaining({
        context: expect.objectContaining({
          unifiedAiNode: expect.objectContaining({ nodeId: CARE_DROID_UNIFIED_AI_NODE_ID }),
          capabilityId: 'copilot',
        }),
      }),
    );
  });

  it('invokeUnifiedAiRequest delegates to conversational node entry', async () => {
    const response = { ok: true, content: 'balanced' } as AIResponse;
    requestAiChiefConversational.mockResolvedValue(response);

    await invokeUnifiedAiRequest({
      requestType: 'STAFF_BALANCE',
      message: 'balance staff',
      platformServiceId: 'copilot',
    } as unknown as Parameters<typeof invokeUnifiedAiRequest>[0]);

    expect(requestAiChiefConversational).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          capabilityId: 'copilot',
        }),
      }),
      undefined,
    );
  });
});