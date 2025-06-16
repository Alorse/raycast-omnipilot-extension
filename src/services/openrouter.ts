import { OpenRouterMessage, StreamingOptions } from '../types';
import { processStreamingResponse } from '../utils/streaming';
import { LLMConfigManager } from './llmConfigManager';
import { GitHubCopilotService } from './githubCopilot';
import { ModelInfo, CachedModels } from '../types/llmConfig';

// Types for API responses
interface ModelApiResponse {
  id?: string;
  name?: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

interface ModelsApiResponse {
  data?: ModelApiResponse[];
  models?: ModelApiResponse[];
}

/**
 * AI API service for making streaming chat completions
 * Supports OpenRouter, OpenAI, Anthropic, GitHub Copilot, and other compatible APIs
 */
export class AIService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://openrouter.ai/api/v1';
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
      // Check if this is GitHub Copilot
      if (
        this.baseUrl.includes('githubcopilot.com') ||
        this.baseUrl.includes('api.github.com')
      ) {
        const copilotService = new GitHubCopilotService(this.apiKey);
        return await copilotService.streamChatCompletion(
          messages,
          model,
          options,
        );
      }

      // Original implementation for other providers
      // First, do the streaming request
      const streamResponse = await fetch(`${this.baseUrl}/chat/completions`, {
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

      if (!streamResponse.ok) {
        // Try to extract error message from response body
        let errorMessage = `HTTP error! status: ${streamResponse.status}`;
        try {
          const errorBody = await streamResponse.text();
          const errorData = JSON.parse(errorBody);

          // Try to extract a more specific error message
          const specificMessage = extractErrorMessage(errorData);
          if (specificMessage) {
            errorMessage = specificMessage;
          }

          // Add status code context if we have a good message
          if (specificMessage && streamResponse.status !== 200) {
            errorMessage = `[${streamResponse.status}] ${specificMessage}`;
          }
        } catch (parseError) {
          // If we can't parse the error body, keep the default message
          console.warn('Could not parse error response:', parseError);
        }

        console.error(
          'Failed to fetch chat completion:',
          streamResponse.status,
          errorMessage,
        );
        throw new Error(errorMessage);
      }

      const { fullResponse, usage } = await processStreamingResponse(
        streamResponse,
        (content) => {
          options.onChunk?.(content);
        },
      );

      // Call onComplete with the full response and usage information
      options.onComplete?.(fullResponse, usage);

      return fullResponse;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
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
    options: StreamingOptions = {},
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

  /**
   * Fetch available models from the provider's /models endpoint
   * @returns Promise with models info or null if not available
   */
  async fetchModels(): Promise<CachedModels> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorMessage = `Models endpoint returned ${response.status}: ${response.statusText}`;
        return {
          models: [],
          lastUpdated: new Date(),
          isAvailable: false,
          errorMessage
        };
      }

      const data = await response.json();
      
      // Handle different response formats
      let models: ModelInfo[] = [];
      
      const apiResponse = data as ModelsApiResponse | ModelApiResponse[];
      
      if (Array.isArray(apiResponse)) {
        // Direct array format
        models = apiResponse.map((model: ModelApiResponse) => ({
          id: model.id || model.name || '',
          object: model.object,
          created: model.created,
          owned_by: model.owned_by
        }));
      } else if (apiResponse.data && Array.isArray(apiResponse.data)) {
        // OpenAI/OpenRouter format: { data: [...] }
        models = apiResponse.data.map((model: ModelApiResponse) => ({
          id: model.id || model.name || '',
          object: model.object,
          created: model.created,
          owned_by: model.owned_by
        }));
      } else if (apiResponse.models && Array.isArray(apiResponse.models)) {
        // Custom format: { models: [...] }
        models = apiResponse.models.map((model: ModelApiResponse) => ({
          id: model.id || model.name || '',
          object: model.object,
          created: model.created,
          owned_by: model.owned_by
        }));
      }

      // Filter out empty IDs and sort by ID
      models = models
        .filter(model => model.id && model.id.trim())
        .sort((a, b) => a.id.localeCompare(b.id));

      return {
        models,
        lastUpdated: new Date(),
        isAvailable: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching models';
      return {
        models: [],
        lastUpdated: new Date(),
        isAvailable: false,
        errorMessage
      };
    }
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

  throw new Error(
    "No API configuration found. Please set up an LLM configuration in 'Manage LLMs'.",
  );
}

/**
 * Get the model to use for AI requests
 */
export async function getActiveModel(): Promise<string> {
  const activeConfig = await LLMConfigManager.getActiveLLM();

  if (activeConfig && activeConfig.model) {
    return activeConfig.model;
  }

  return 'openai/gpt-4o';
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
  if (!errorData || typeof errorData !== 'object') {
    return null;
  }

  const data = errorData as Record<string, unknown>;

  // Handle OpenRouter error format
  if (typeof data.message === 'string') {
    return data.message;
  }

  // Handle OpenAI error format
  if (data.error && typeof data.error === 'object') {
    const error = data.error as Record<string, unknown>;
    if (typeof error.message === 'string') {
      return error.message;
    }

    // Handle Anthropic error format
    if (typeof error.type === 'string' && typeof error.message === 'string') {
      return `${error.type}: ${error.message}`;
    }
  }

  // Handle generic error formats
  if (typeof data.detail === 'string') {
    return data.detail;
  }

  if (typeof data.msg === 'string') {
    return data.msg;
  }

  // Last resort: look for any string field that might be an error message
  const possibleMessages = Object.values(data)
    .filter(
      (value): value is string =>
        typeof value === 'string' && value.length > 0 && value.length < 300,
    )
    .filter((message) => {
      const lowerMessage = message.toLowerCase();
      return (
        lowerMessage.includes('error') ||
        lowerMessage.includes('fail') ||
        lowerMessage.includes('not found') ||
        lowerMessage.includes('invalid') ||
        lowerMessage.includes('unauthorized') ||
        lowerMessage.includes('forbidden')
      );
    });

  return possibleMessages.length > 0 ? possibleMessages[0] : null;
}
