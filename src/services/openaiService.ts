/**
 * Wrapper service for OpenAI API integration
 * Provides typed interface for chat completions and other OpenAI features
 */

import appConfig from '../config/appConfig';
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
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = appConfig.ai.openai.apiKey;
    this.model = appConfig.ai.openai.model;
    this.baseUrl = appConfig.ai.openai.baseUrl;
  }

  /**
   * Create a chat completion request
   * @param request Chat completion request with messages
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<OpenAIResponse> {
    if (!this.apiKey) {
      logger.warn('OpenAI API key not configured');
      return { success: false, error: 'OpenAI API key not configured' };
    }

    try {
      const payload = {
        model: this.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 2000,
        top_p: request.top_p ?? 1.0,
      };

      logger.debug('OpenAI chat completion request', { model: this.model });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenAI API error: ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`,
        );
      }

      const data = await response.json();
      logger.debug('OpenAI response received', {
        model: data.model,
        tokensUsed: data.usage?.total_tokens,
      });

      return { success: true, data };
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
    return !!this.apiKey && !!this.model;
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
  setConfig(apiKey: string, model: string, baseUrl?: string): void {
    this.apiKey = apiKey;
    this.model = model;
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
    logger.info(`OpenAI config updated: model=${model}`);
  }
}

export default new OpenAIService();
