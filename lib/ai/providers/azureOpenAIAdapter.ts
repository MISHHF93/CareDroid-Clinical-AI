import { AIError, type AIRequest, type AIResponse, type AIUsage } from '../llmTransport';
import type { LlmAdapter, LlmAdapterHealth, LlmAdapterRuntime } from './types';

/**
 * Azure OpenAI Chat Completions adapter (non-streaming).
 * Requires AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT.
 */
export class AzureOpenAIAdapter implements LlmAdapter {
  readonly id = 'azure-openai' as const;

  health(runtime?: LlmAdapterRuntime): LlmAdapterHealth {
    const cfg = resolveAzureConfig(runtime);
    const configured = Boolean(cfg.endpoint && cfg.apiKey && cfg.deployment);
    return {
      provider: 'azure-openai',
      ok: configured,
      configured,
      detail: configured
        ? `deployment=${cfg.deployment}`
        : 'Need AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT',
    };
  }

  async complete(request: AIRequest, runtime?: LlmAdapterRuntime): Promise<AIResponse> {
    if (request.stream) {
      throw new AIError({
        message: 'Azure OpenAI adapter does not support streaming in this build',
        code: 'AI_BAD_REQUEST',
        requestType: request.requestType,
      });
    }

    const cfg = resolveAzureConfig(runtime);
    if (!cfg.endpoint || !cfg.apiKey || !cfg.deployment) {
      throw new AIError({
        message:
          'Azure OpenAI not configured (AZURE_OPENAI_ENDPOINT / API_KEY / DEPLOYMENT)',
        code: 'AI_CONFIG_ERROR',
        requestType: request.requestType,
      });
    }

    const maxTokens = request.maxTokens || 1000;
    const url = `${cfg.endpoint.replace(/\/$/, '')}/openai/deployments/${encodeURIComponent(
      cfg.deployment,
    )}/chat/completions?api-version=${encodeURIComponent(cfg.apiVersion)}`;

    const messages = [
      { role: 'system', content: request.systemPrompt },
      ...(request.messages || []).map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': cfg.apiKey,
        },
        body: JSON.stringify({
          messages,
          max_tokens: maxTokens,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data?.error?.message || `Azure OpenAI error ${response.status}`;
        throw new AIError({
          message,
          code: response.status === 429 ? 'AI_RATE_LIMIT' : 'AI_PROVIDER_ERROR',
          status: response.status,
          requestType: request.requestType,
          retryable: response.status === 429 || response.status >= 500,
        });
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      const usage = emptyUsage();
      usage.inputTokens = data?.usage?.prompt_tokens ?? 0;
      usage.outputTokens = data?.usage?.completion_tokens ?? 0;
      usage.totalTokens = data?.usage?.total_tokens ?? usage.inputTokens + usage.outputTokens;

      runtime?.metadataLogger?.({
        requestType: request.requestType,
        model: cfg.deployment,
        stream: false,
        maxTokens,
        usage: { ...usage },
        toolCallCount: 0,
        provider: 'azure-openai',
      });

      return {
        ok: true,
        status: response.status,
        content: String(content),
        data: { ...data, provider: 'azure-openai', model: cfg.deployment },
        toolCalls: [],
        usage,
        requestType: request.requestType,
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      throw new AIError({
        message: error instanceof Error ? error.message : String(error),
        code: 'AI_NETWORK_ERROR',
        requestType: request.requestType,
        retryable: true,
        cause: error,
      });
    }
  }
}

function resolveAzureConfig(runtime?: LlmAdapterRuntime) {
  const env = typeof process !== 'undefined' ? process.env : {};
  return {
    endpoint: runtime?.azureEndpoint || env.AZURE_OPENAI_ENDPOINT || '',
    apiKey: runtime?.apiKey || env.AZURE_OPENAI_API_KEY || '',
    deployment:
      runtime?.azureDeployment ||
      runtime?.model ||
      env.AZURE_OPENAI_DEPLOYMENT ||
      env.AI_MODEL ||
      '',
    apiVersion: runtime?.azureApiVersion || env.AZURE_OPENAI_API_VERSION || '2024-06-01',
  };
}

function emptyUsage(): AIUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
  };
}

export const azureOpenAIAdapter = new AzureOpenAIAdapter();
