import { afterEach, describe, expect, it, vi } from 'vitest';
import { callAI, UNIFIED_AI_MODEL } from './client';

const apiClientMocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  parseApiResponse: vi.fn(),
}));

vi.mock('../apiClient', () => ({
  apiFetch: apiClientMocks.apiFetch,
  parseApiResponse: apiClientMocks.parseApiResponse,
}));

describe('canonical AI client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    apiClientMocks.apiFetch.mockReset();
    apiClientMocks.parseApiResponse.mockReset();
  });

  it('routes server calls through the unified Anthropic Messages request shape', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test');
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'Ready for human review.' }],
          usage: { input_tokens: 12, output_tokens: 7 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await callAI({
      requestType: 'COPILOT_CHAT',
      systemPrompt: 'Be concise. Human review required.',
      messages: [{ role: 'user', content: 'Summarize capacity.' }],
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init.body));

    expect(body.model).toBe(UNIFIED_AI_MODEL);
    expect(body.max_tokens).toBe(1000);
    expect(body.messages).toEqual([{ role: 'user', content: 'Summarize capacity.' }]);
    expect(response.content).toBe('Ready for human review.');
    expect(response.usage.totalTokens).toBe(19);
  });

  it('routes all browser CareDroid AI calls through the unified node conversational endpoint', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {});
    apiClientMocks.apiFetch.mockResolvedValue(new Response('{}', { status: 200 }));
    apiClientMocks.parseApiResponse.mockResolvedValue({ response: 'Ready for human review.' });

    const cases = [
      'INTAKE_SUGGESTION',
      'CLINICAL_SUMMARY',
      'SHIFT_SUMMARY',
      'COPILOT_CHAT',
    ] as const;

    for (const requestType of cases) {
      await callAI({
        requestType,
        systemPrompt: 'Human review required.',
        messages: [{ role: 'user', content: 'Summarize the current state.' }],
      });

      expect(apiClientMocks.apiFetch).toHaveBeenLastCalledWith(
        '/api/ai/node/conversational',
        expect.objectContaining({ method: 'POST' }),
      );
    }
  });

  it('routes unified node conversational calls through /api/ai/node/conversational', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {});
    apiClientMocks.apiFetch.mockResolvedValue(new Response('{}', { status: 200 }));
    apiClientMocks.parseApiResponse.mockResolvedValue({ response: 'Unified node response.' });

    await callAI({
      requestType: 'COPILOT_CHAT',
      systemPrompt: 'Human review required.',
      messages: [{ role: 'user', content: 'Queue status?' }],
      context: {
        unifiedAiNode: {
          nodeId: 'CareDroidUnifiedAINode',
          route: '/api/ai/node',
        },
      },
    });

    expect(apiClientMocks.apiFetch).toHaveBeenCalledWith(
      '/api/ai/node/conversational',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
