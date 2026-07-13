import type { AIRequest, AIResponse } from '../llmTransport';
import type { AIRequestType } from '../types';
import type { AiDeployMode } from '../deploymentFlags';

export type LlmProviderId = 'anthropic' | 'openai' | 'azure-openai' | 'gemini' | 'local';

export interface LlmAdapterHealth {
  provider: LlmProviderId;
  ok: boolean;
  configured: boolean;
  detail: string;
}

export interface LlmAdapterRuntime {
  apiKey?: string;
  /** Azure OpenAI endpoint root, e.g. https://my-resource.openai.azure.com */
  azureEndpoint?: string;
  azureApiVersion?: string;
  azureDeployment?: string;
  /** Optional override model/deployment name */
  model?: string;
  metadataLogger?: (metadata: {
    requestType: AIRequestType;
    model: string;
    stream: boolean;
    maxTokens: number;
    usage: AIResponse['usage'];
    toolCallCount: number;
    provider?: LlmProviderId;
    phiMinimized?: boolean;
    redactionCount?: number;
    deployMode?: AiDeployMode;
  }) => void;
}

export interface LlmAdapter {
  readonly id: LlmProviderId;
  health(runtime?: LlmAdapterRuntime): LlmAdapterHealth;
  complete(request: AIRequest, runtime?: LlmAdapterRuntime): Promise<AIResponse>;
}
