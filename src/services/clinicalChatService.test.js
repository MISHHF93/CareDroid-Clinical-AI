import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyzeClinicalVitals,
  mapChatResponseToAssistantMessage,
  normalizeAiFoundationMetadata,
  normalizeRagSourcePanel,
  normalizeToolResultForUi,
  sendClinicalChatMessage,
  suggestClinicalAction,
} from './clinicalChatService';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
  buildApiUrl: vi.fn((p) => p || ''),
  parseApiResponse: vi.fn(async (response) => response.json()),
}));

import { apiFetch } from './apiClient';

describe('clinicalChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizeToolResultForUi wraps bare data', () => {
    const out = normalizeToolResultForUi({
      toolId: 'sofa-calculator',
      toolName: 'SOFA',
      result: { totalScore: 5 },
    });
    expect(out.result.data).toEqual({ totalScore: 5 });
  });

  it('mapChatResponseToAssistantMessage maps toolResult and text', () => {
    const msg = mapChatResponseToAssistantMessage({
      response: 'Hello',
      toolResult: {
        toolId: 'drug-interactions',
        toolName: 'Drug',
        result: { success: true, data: { interactions: [] } },
      },
    });
    expect(msg.content).toBe('Hello');
    expect(msg.toolResult.toolId).toBe('drug-interactions');
  });

  it('normalizes RAG source panel references from chat responses', () => {
    const sourcePanel = normalizeRagSourcePanel({
      confidence: 0.84,
      ragContext: {
        chunksRetrieved: 2,
        sourcesFound: 1,
        references: [
          {
            id: 'ref-sepsis',
            sourceId: 'sepsis-guideline',
            title: 'Sepsis Guideline',
            type: 'clinical_guideline',
            relevance: 0.92,
          },
        ],
      },
    });

    expect(sourcePanel).toMatchObject({
      confidence: 0.84,
      references: [expect.objectContaining({ sourceId: 'sepsis-guideline' })],
      retrieval: expect.objectContaining({ chunksRetrieved: 2, sourcesFound: 1 }),
    });
  });

  it('mapChatResponseToAssistantMessage exposes RAG source panel data', () => {
    const msg = mapChatResponseToAssistantMessage({
      response: 'Evidence-based response',
      sourcePanel: {
        confidence: 0.9,
        references: [
          {
            id: 'ref-protocol',
            sourceId: 'protocol-1',
            title: 'Protocol',
            type: 'protocol',
            relevance: 0.9,
          },
        ],
      },
    });

    expect(msg.sourcePanel.references[0]).toMatchObject({
      sourceId: 'protocol-1',
      relevance: 0.9,
    });
  });

  it('normalizes AI foundation metadata for assistant rendering', () => {
    const aiFoundation = normalizeAiFoundationMetadata({
      aiFoundation: {
        route: 'medical_reference',
        selectedExpert: 'cardiology',
        confidence: 0.82,
        routeScore: 6.12,
        routingMode: 'multi_expert',
        requiresHumanReview: true,
      },
      routePlan: { fallbackApplied: true },
      cost: { estimated: 0.14, savedBy: ['lightweight_router'] },
    });

    expect(aiFoundation).toMatchObject({
      selectedExpert: 'cardiology',
      selectedExperts: [
        expect.objectContaining({
          expertId: 'cardiology',
          role: 'primary',
        }),
      ],
      routeScore: 6.12,
      routingMode: 'multi_expert',
      fallbackApplied: true,
      estimatedCost: 0.14,
      costReductionApplied: ['lightweight_router'],
      requiresHumanReview: true,
    });
  });

  it('mapChatResponseToAssistantMessage exposes normalized AI foundation metadata', () => {
    const msg = mapChatResponseToAssistantMessage({
      response: 'Hello',
      metadata: {
        aiFoundation: {
          route: 'administrative',
          selectedExpert: 'operations',
          confidence: 0.76,
          routeScore: 10.2,
          estimatedCost: 0.08,
        },
        aiGateway: {
          pipeline: [{ stage: 'ai_gateway', status: 'complete' }],
        },
      },
    });

    expect(msg.aiFoundation).toMatchObject({
      selectedExpert: 'operations',
      routeScore: 10.2,
      estimatedCost: 0.08,
    });
    expect(msg.aiGateway.pipeline[0]).toEqual({ stage: 'ai_gateway', status: 'complete' });
    expect(msg.metadata.aiFoundation.selectedExpert).toBe('operations');
  });

  it('sendClinicalChatMessage posts JSON', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'ok' }),
    });
    const res = await sendClinicalChatMessage({
      message: 'hi',
      tool: 'drug-interactions',
      conversationId: '12',
      authToken: 'tok',
    });
    expect(res.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/chat/message',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    );
    const body = JSON.parse(apiFetch.mock.calls[0][1].body);
    expect(body.message).toBe('hi');
    expect(body.tool).toBe('drug-interactions');
    expect(body.conversationId).toBe(12);
    expect(body.knowledgeBaseContext).toMatchObject({
      searchedFirst: true,
      query: 'hi',
    });
  });

  it('sendClinicalChatMessage includes matching knowledge base articles before assistant routing', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'ok' }),
    });

    await sendClinicalChatMessage({
      message: 'How do I fix tenant context access?',
    });

    const body = JSON.parse(apiFetch.mock.calls[0][1].body);
    expect(body.knowledgeBaseContext.matches[0]).toMatchObject({
      id: 'troubleshooting-tenant-context',
      category: 'troubleshooting',
    });
  });

  it('sendClinicalChatMessage includes sanitized memory fabric context when provided', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'ok' }),
    });

    await sendClinicalChatMessage({
      message: 'Use my workspace context',
      memoryContext: {
        workspaceMemory: { recentAssets: ['qsofa'] },
        userMemory: { pinnedAssets: ['drug-check'] },
        rules: { rawPromptIncluded: false, rawSearchIncluded: false },
      },
    });

    const body = JSON.parse(apiFetch.mock.calls[0][1].body);
    expect(body.memoryContext).toMatchObject({
      workspaceMemory: { recentAssets: ['qsofa'] },
      userMemory: { pinnedAssets: ['drug-check'] },
      rules: { rawSearchIncluded: false },
    });
  });

  it('suggestClinicalAction posts patient context', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ suggestion: 'review vitals' }),
    });

    const res = await suggestClinicalAction({
      patientId: 'patient-1',
      context: { setting: 'icu' },
      authToken: 'tok',
    });

    expect(res.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/chat/suggest-action',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    );
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({
      patientId: 'patient-1',
      context: { setting: 'icu' },
    });
  });

  it('analyzeClinicalVitals posts vitals payload', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ risk: 'low' }),
    });

    const res = await analyzeClinicalVitals({
      vitals: { hr: 88 },
      authToken: 'tok',
    });

    expect(res.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/chat/analyze-vitals',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    );
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({
      vitals: { hr: 88 },
    });
  });
});
