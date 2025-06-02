import { OpenRouterMessage, Preferences, StreamingOptions } from '../types';
import { processStreamingResponse } from '../utils/streaming';

/**
 * OpenRouter API service for making streaming chat completions
 */
export class OpenRouterService {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Send a chat completion request with streaming
   * @param messages - Array of messages to send
   * @param model - Model to use for the completion
   * @param options - Streaming options
   * @returns Promise that resolves with the complete response
   */
  async streamChatCompletion(
    messages: OpenRouterMessage[],
    model: string,
    options: StreamingOptions = {}
  ): Promise<string> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const fullResponse = await processStreamingResponse(response, (content) => {
        options.onChunk?.(content);
      });

      options.onComplete?.(fullResponse);
      return fullResponse;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      options.onError?.(errorObj);
      throw errorObj;
    }
  }

  /**
   * Helper method to create a simple ask AI request
   * @param query - The user's question
   * @param systemPrompt - System prompt to guide the AI
   * @param model - Model to use
   * @param options - Streaming options
   */
  async askAI(
    query: string,
    systemPrompt: string,
    model: string,
    options: StreamingOptions = {}
  ): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: query,
      },
    ];

    return this.streamChatCompletion(messages, model, options);
  }
}

/**
 * Factory function to create OpenRouter service from preferences
 */
export function createOpenRouterService(preferences: Preferences): OpenRouterService {
  return new OpenRouterService(preferences.openrouterApiKey);
}
