import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIError } from '../llmTransport';
import { groqAdapter } from './groqAdapter';

describe('GroqAdapter', () => {
  const prevKey = process.env.GROQ_API_KEY;
  const prevModel = process.env.GROQ_MODEL;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (prevKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = prevKey;
    if (prevModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = prevModel;
  });

  it('reports unconfigured when GROQ_API_KEY is missing', () => {
    delete process.env.GROQ_API_KEY;
    const health = groqAdapter.health();
    expect(health.provider).toBe('groq');
    expect(health.configured).toBe(false);
    expect(health.ok).toBe(false);
  });

  it('throws AI_CONFIG_ERROR when key missing on complete', async () => {
    delete process.env.GROQ_API_KEY;
    await expect(
      groqAdapter.complete({
        systemPrompt: 'sys',
        requestType: 'COPILOT_CHAT' as any,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toMatchObject({ code: 'AI_CONFIG_ERROR' });
  });

  it('calls Groq OpenAI-compatible endpoint with timeout-safe fetch', async () => {
    process.env.GROQ_API_KEY = 'gsk-test';
    process.env.GROQ_MODEL = 'llama-3.3-70b-versatile';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'hello from groq' } }],
        usage: { prompt_tokens: 3, completion_tokens: 5, total_tokens: 8 },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await groqAdapter.complete({
      systemPrompt: 'You are a test assistant.',
      requestType: 'COPILOT_CHAT' as any,
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 64,
    });

    expect(result.ok).toBe(true);
    expect(String(result.content)).toContain('hello from groq');
    expect(result.data.provider).toBe('groq');
    expect(result.data.model).toBe('llama-3.3-70b-versatile');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer gsk-test',
        }),
      }),
    );
  });

  it('maps 429 to AI_RATE_LIMIT', async () => {
    process.env.GROQ_API_KEY = 'gsk-test';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'rate limited' } }),
      })),
    );

    await expect(
      groqAdapter.complete({
        systemPrompt: 'x',
        requestType: 'COPILOT_CHAT' as any,
        message: 'y',
      }),
    ).rejects.toBeInstanceOf(AIError);

    try {
      await groqAdapter.complete({
        systemPrompt: 'x',
        requestType: 'COPILOT_CHAT' as any,
        message: 'y',
      });
    } catch (error) {
      expect((error as AIError).code).toBe('AI_RATE_LIMIT');
      expect((error as AIError).retryable).toBe(true);
    }
  });
});
