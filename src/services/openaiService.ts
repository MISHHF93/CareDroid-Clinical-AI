/**
 * Compatibility wrapper for legacy chat-completion callers.
 * Frontend requests are proxied through the backend unified AI client.
 * @deprecated Prefer feature-specific backend AI requests with explicit requestType.
 */

import appConfig from '../config/appConfig';
import { API_ROUTES } from '../config/api.config';
import { apiFetchJson } from './apiClient';
import logger from '../utils/logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface AIProxyResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

class AIProxyService {
  private model: string;

  constructor() {
    this.model = appConfig.ai.model;
  }

  /**
   * Create a chat completion request
   * @param request Chat completion request with messages
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<AIProxyResponse> {
    try {
      const lastUserMessage = [...request.messages].reverse().find((message) => message.role === 'user');
      const { response, data } = await apiFetchJson(API_ROUTES.chat.message, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: lastUserMessage?.content || request.messages.map((message) => message.content).join('\n'),
        }),
      });

      if (!response.ok) {
        throw new Error(data?.message || `AI backend request failed: ${response.statusText}`);
      }

      logger.debug('Backend AI response received', { model: this.model });

      return {
        success: true,
        data: {
          model: this.model,
          choices: [{ message: { role: 'assistant', content: data.response || '' } }],
          raw: data,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('AI backend request failed', error);
      return { success: false, error: message, status: 500 };
    }
  }

  /**
   * Extract the response text from a chat completion-shaped payload.
   */
  extractResponseText(data: any): string {
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    logger.warn('Could not extract text from AI response');
    return '';
  }

  /**
   * Check if the AI proxy is configured.
   */
  isConfigured(): boolean {
    return !!this.model;
  }

  /**
   * Get the current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Update configuration (for dynamic switching)
   */
  setConfig(_apiKey: string, model: string, _baseUrl?: string): void {
    this.model = model;
    logger.info(`AI proxy config updated: model=${model}`);
  }
}

export default new AIProxyService();
