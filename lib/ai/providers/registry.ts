import { anthropicAdapter } from './anthropicAdapter';
import { azureOpenAIAdapter } from './azureOpenAIAdapter';
import { geminiAdapter } from './geminiAdapter';
import { groqAdapter } from './groqAdapter';
import { localAdapter } from './localAdapter';
import { openAIAdapter } from './openaiAdapter';
import type { LlmAdapter, LlmAdapterHealth, LlmProviderId } from './types';

const ADAPTERS: Record<LlmProviderId, LlmAdapter> = {
  anthropic: anthropicAdapter,
  openai: openAIAdapter,
  'azure-openai': azureOpenAIAdapter,
  gemini: geminiAdapter,
  groq: groqAdapter,
  local: localAdapter,
};

export function normalizeProviderId(value: string | undefined | null): LlmProviderId {
  const raw = String(value || 'anthropic').toLowerCase().trim();
  if (raw === 'azure_openai' || raw === 'azure-openai' || raw === 'azure') return 'azure-openai';
  if (raw === 'openai') return 'openai';
  if (raw === 'gemini' || raw === 'google') return 'gemini';
  if (raw === 'groq') return 'groq';
  if (raw === 'local' || raw === 'mock' || raw === 'deterministic') return 'local';
  return 'anthropic';
}

export function getAdapter(provider: LlmProviderId | string): LlmAdapter {
  const id = normalizeProviderId(typeof provider === 'string' ? provider : provider);
  return ADAPTERS[id] || ADAPTERS.anthropic;
}

export function listAdapterHealth(): LlmAdapterHealth[] {
  return (Object.keys(ADAPTERS) as LlmProviderId[]).map((id) => ADAPTERS[id].health());
}

export function resolvePrimaryProvider(): LlmProviderId {
  return normalizeProviderId(
    typeof process !== 'undefined' ? process.env.AI_PROVIDER : 'anthropic',
  );
}

export function resolveFallbackProvider(): LlmProviderId | null {
  if (typeof process === 'undefined') return null;
  const raw = process.env.AI_FALLBACK_PROVIDER || process.env.AI_FALLBACK_MODEL_PROVIDER;
  if (!raw) {
    // If primary is not local and local fallback is requested
    if (process.env.AI_LOCAL_FALLBACK === '1') return 'local';
    return null;
  }
  return normalizeProviderId(raw);
}
