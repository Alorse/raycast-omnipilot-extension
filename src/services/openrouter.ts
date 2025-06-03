import { OpenRouterMessage, StreamingOptions } from "../types";
import { processStreamingResponse } from "../utils/streaming";
import { LLMConfigManager } from "./llmConfigManager";

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
        // Try to extract error message from response body
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.text();
          const errorData = JSON.parse(errorBody);

          // Try to extract a more specific error message
          const specificMessage = extractErrorMessage(errorData);
          if (specificMessage) {
            errorMessage = specificMessage;
          }

          // Add status code context if we have a good message
          if (specificMessage && response.status !== 200) {
            errorMessage = `[${response.status}] ${specificMessage}`;
          }
        } catch (parseError) {
          // If we can't parse the error body, keep the default message
          console.warn("Could not parse error response:", parseError);
        }

        console.error("Failed to fetch chat completion:", response.status, errorMessage);
        throw new Error(errorMessage);
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
 * Initialize default LLM configurations if none exist
 */
export async function createAIServiceFromConfig(): Promise<AIService> {
  const activeConfig = await LLMConfigManager.getActiveLLM();

  if (activeConfig && activeConfig.apiKey) {
    return new AIService(activeConfig.apiKey, activeConfig.apiUrl);
  }

  throw new Error("No API configuration found. Please set up an LLM configuration in 'Manage LLMs'.");
}

/**
 * Get the model to use for AI requests
 */
export async function getActiveModel(): Promise<string> {
  const activeConfig = await LLMConfigManager.getActiveLLM();

  if (activeConfig && activeConfig.model) {
    return activeConfig.model;
  }

  return "openai/gpt-4o";
}

/**
 * Initialize default LLM configurations if none exist
 */
export async function initializeLLMConfigs(): Promise<void> {
  await LLMConfigManager.initializeDefaults();
}

/**
 * Extract error message from different API error response formats
 * @param errorData - The parsed JSON error response
 * @returns A human-readable error message
 */
function extractErrorMessage(errorData: unknown): string | null {
  if (!errorData || typeof errorData !== "object") {
    return null;
  }

  const data = errorData as Record<string, unknown>;

  // Handle OpenRouter error format
  if (typeof data.message === "string") {
    return data.message;
  }

  // Handle OpenAI error format
  if (data.error && typeof data.error === "object") {
    const error = data.error as Record<string, unknown>;
    if (typeof error.message === "string") {
      return error.message;
    }

    // Handle Anthropic error format
    if (typeof error.type === "string" && typeof error.message === "string") {
      return `${error.type}: ${error.message}`;
    }
  }

  // Handle generic error formats
  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (typeof data.msg === "string") {
    return data.msg;
  }

  // Last resort: look for any string field that might be an error message
  const possibleMessages = Object.values(data)
    .filter((value): value is string => typeof value === "string" && value.length > 0 && value.length < 300)
    .filter((message) => {
      const lowerMessage = message.toLowerCase();
      return (
        lowerMessage.includes("error") ||
        lowerMessage.includes("fail") ||
        lowerMessage.includes("not found") ||
        lowerMessage.includes("invalid") ||
        lowerMessage.includes("unauthorized") ||
        lowerMessage.includes("forbidden")
      );
    });

  return possibleMessages.length > 0 ? possibleMessages[0] : null;
}
