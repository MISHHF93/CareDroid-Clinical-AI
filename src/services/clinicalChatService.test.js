import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyzeClinicalVitals,
  mapChatResponseToAssistantMessage,
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
