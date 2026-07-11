import type { AIRequest, AIResponse } from '../llmTransport';
import type { LlmAdapter, LlmAdapterHealth, LlmAdapterRuntime } from './types';

/**
 * Deterministic local adapter — no external network.
 * Used for tests, degraded mode, and AI_PROVIDER=local.
 */
export class LocalAdapter implements LlmAdapter {
  readonly id = 'local' as const;

  health(): LlmAdapterHealth {
    return {
      provider: 'local',
      ok: true,
      configured: true,
      detail: 'Deterministic local adapter (no external LLM)',
    };
  }

  async complete(request: AIRequest, runtime?: LlmAdapterRuntime): Promise<AIResponse> {
    const model = runtime?.model || 'local-deterministic-v1';
    const userText =
      request.message ||
      [...(request.messages || [])].reverse().find((m) => m.role === 'user')?.content ||
      '';

    const content = [
      '[CareDroid local AI adapter]',
      'External LLM is not used for this request.',
      'This is a deterministic degraded-mode response for tests and offline operation.',
      'Human review is required before any clinical action.',
      userText ? `Echo (minimized context): ${userText.slice(0, 240)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const usage = {
      inputTokens: Math.ceil((request.systemPrompt?.length || 0) / 4),
      outputTokens: Math.ceil(content.length / 4),
      totalTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    };
    usage.totalTokens = usage.inputTokens + usage.outputTokens;

    runtime?.metadataLogger?.({
      requestType: request.requestType,
      model,
      stream: false,
      maxTokens: request.maxTokens || 0,
      usage: { ...usage },
      toolCallCount: 0,
      provider: 'local',
    });

    return {
      ok: true,
      status: 200,
      content,
      data: {
        provider: 'local',
        model,
        degraded: true,
        requiresClinicianReview: true,
      },
      toolCalls: [],
      usage,
      requestType: request.requestType,
    };
  }
}

export const localAdapter = new LocalAdapter();
