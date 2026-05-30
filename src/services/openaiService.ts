/**
 * Wrapper service for OpenAI API integration
 * Provides typed interface for chat completions and other OpenAI features
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

export interface OpenAIResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

class OpenAIService {
  private model: string;

  constructor() {
    this.model = appConfig.ai.openai.model;
  }

  /**
   * Create a chat completion request
   * @param request Chat completion request with messages
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<OpenAIResponse> {
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
      logger.error('OpenAI API request failed', error);
      return { success: false, error: message, status: 500 };
    }
  }

  /**
   * Extract the response text from OpenAI chat completion
   */
  extractResponseText(data: any): string {
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    logger.warn('Could not extract text from OpenAI response');
    return '';
  }

  /**
   * Check if OpenAI is configured
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
    logger.info(`OpenAI config updated: model=${model}`);
  }
}

export default new OpenAIService();
