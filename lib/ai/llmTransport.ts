/**
 * Shared LLM transport types — no provider imports (avoids circular deps).
 */

import type { AIRequestType, ToolDefinition } from './types';

export type { ToolDefinition };

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface AIRequest {
  messages?: Message[];
  systemPrompt: string;
  requestType: AIRequestType;
  stream?: boolean;
  maxTokens?: number;
  tools?: ToolDefinition[];
  context?: Record<string, unknown>;
  message?: string;
  type?: AIRequestType;
  patientId?: string;
  encounterId?: string;
}

export interface AIRequestConfig extends AIRequest {}

export interface AIResponse {
  ok: boolean;
  status: number;
  content: string | ReadableStream<Uint8Array>;
  data: Record<string, unknown>;
  toolCalls: ToolCall[];
  usage: AIUsage;
  requestType: AIRequestType;
}

export type AIErrorCode =
  | 'AI_AUTH_ERROR'
  | 'AI_RATE_LIMIT'
  | 'AI_BAD_REQUEST'
  | 'AI_STREAM_ERROR'
  | 'AI_PROVIDER_ERROR'
  | 'AI_NETWORK_ERROR'
  | 'AI_CONFIG_ERROR'
  | 'AI_KILL_SWITCH'
  | 'AI_TIMEOUT'
  | 'AI_CIRCUIT_OPEN';

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly status?: number;
  readonly requestType?: AIRequestType;
  readonly retryable: boolean;

  constructor(input: {
    message: string;
    code: AIErrorCode;
    status?: number;
    requestType?: AIRequestType;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(input.message);
    this.name = 'AIError';
    this.code = input.code;
    this.status = input.status;
    this.requestType = input.requestType;
    this.retryable = input.retryable ?? false;
    if (input.cause) {
      (this as any).cause = input.cause;
    }
  }
}

export const UNIFIED_AI_MODEL = 'claude-sonnet-4-6';
export const DEFAULT_AI_MAX_TOKENS = 1000;
