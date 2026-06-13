import { afterEach, describe, expect, it, vi } from 'vitest';
import { callAI, UNIFIED_AI_MODEL } from './client';

describe('canonical AI client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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
});
