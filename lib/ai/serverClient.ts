/**
 * Canonical server-side LLM client.
 *
 * All generation goes through the unified egress (`lib/ai/providers/egress.ts`):
 * kill switch → PHI minimize → provider adapter (+ optional fallback).
 *
 * Browser code must not import this module for credentials; use src/lib/ai/client.ts
 * which proxies to the Nest backend.
 */

export type { ToolDefinition, AIRequestType } from './types';

export {
  AIError,
  DEFAULT_AI_MAX_TOKENS,
  UNIFIED_AI_MODEL,
  type AIErrorCode,
  type AIRequest,
  type AIRequestConfig,
  type AIResponse,
  type AIUsage,
  type Message,
  type ToolCall,
} from './llmTransport';

import type { AIRequest, AIRequestConfig, AIResponse } from './llmTransport';
import {
  completeViaEgress,
  getEgressHealth,
  type EgressRuntime,
  type MetadataLogger,
} from './providers/egress';
import { listAdapterHealth, resolvePrimaryProvider } from './providers/registry';

class UnifiedAIClient {
  private apiKey?: string;
  private metadataLogger?: MetadataLogger;
  private provider?: string;

  configure(input: {
    apiKey?: string;
    metadataLogger?: MetadataLogger;
    provider?: string;
  }) {
    this.apiKey = input.apiKey || this.apiKey;
    this.metadataLogger = input.metadataLogger || this.metadataLogger;
    this.provider = input.provider || this.provider;
  }

  async request(config: AIRequestConfig): Promise<AIResponse> {
    return callAI(config, {
      apiKey: this.apiKey,
      metadataLogger: this.metadataLogger,
      provider: this.provider,
    });
  }

  health() {
    return getEgressHealth();
  }
}

export const unifiedAIClient = new UnifiedAIClient();

/** Single server-side generation entry point. */
export async function callAI(
  request: AIRequest,
  runtime?: EgressRuntime,
): Promise<AIResponse> {
  return completeViaEgress(request, runtime);
}

/** @deprecated Prefer callAI — forces anthropic only if provider unset */
export async function callAnthropicAI(
  request: AIRequest,
  runtime?: EgressRuntime,
): Promise<AIResponse> {
  return callAI(request, { ...runtime, provider: runtime?.provider || 'anthropic' });
}

export function getLlmEgressHealth() {
  return getEgressHealth();
}

export function getLlmAdapterHealth() {
  return listAdapterHealth();
}

export function getConfiguredLlmProvider() {
  return resolvePrimaryProvider();
}

export { getEgressHealth };
