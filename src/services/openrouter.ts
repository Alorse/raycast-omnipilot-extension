import { OpenRouterMessage, Preferences, StreamingOptions } from "../types";
import { processStreamingResponse } from "../utils/streaming";

/**
 * AI API service for making streaming chat completions
 * Supports OpenRouter, OpenAI, Anthropic, and other compatible APIs
 */
export class AIService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://openrouter.ai/api/v1";
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
    options: StreamingOptions = {},
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
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
  async askAI(query: string, systemPrompt: string, model: string, options: StreamingOptions = {}): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: query,
      },
    ];

    return this.streamChatCompletion(messages, model, options);
  }
}

/**
 * Factory function to create AI service from preferences
 * Automatically detects if custom API URL and model are provided
 */
export function createAIService(preferences: Preferences): AIService {
  const apiKey = preferences.openrouterApiKey;

  // Use custom API URL if provided, otherwise default to OpenRouter
  const apiUrl = preferences.customApiUrl || "https://openrouter.ai/api/v1";

  return new AIService(apiKey, apiUrl);
}

/**
 * Get the appropriate model to use based on preferences
 * @param preferences - User preferences
 * @returns The model string to use
 */
export function getModelToUse(preferences: Preferences): string {
  // If custom model is provided and custom API URL is set, use the custom model
  if (preferences.customModel && preferences.customApiUrl) {
    return preferences.customModel;
  }

  // Otherwise use the default model
  return preferences.defaultModel;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use createAIService instead
 */
export function createOpenRouterService(preferences: Preferences): AIService {
  return createAIService(preferences);
}

// Re-export for backward compatibility
export { AIService as OpenRouterService };
