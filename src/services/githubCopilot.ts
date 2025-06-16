import { OpenRouterMessage, StreamingOptions } from '../types';
import { processStreamingResponse } from '../utils/streaming';

interface CopilotTokenResponse {
  token: string;
  expires_at: number;
  refresh_token?: string;
}

interface CopilotTokenCache {
  token: string;
  expiresAt: number;
}

/**
 * GitHub Copilot API service for making streaming chat completions
 * Handles token refresh automatically when tokens expire
 */
export class GitHubCopilotService {
  private accessToken: string;
  private tokenCache: CopilotTokenCache | null = null;
  private static readonly COPILOT_API_BASE = 'https://api.githubcopilot.com';
  private static readonly GITHUB_API_BASE = 'https://api.github.com';
  private static readonly TOKEN_BUFFER_MS = 60 * 1000; // 1 minute buffer before expiry

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Get a valid Copilot token, refreshing if necessary
   */
  private async getCopilotToken(): Promise<string> {
    // Check if we have a cached token that's still valid
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    // Fetch a new token from GitHub
    const response = await fetch(
      `${GitHubCopilotService.GITHUB_API_BASE}/copilot_internal/v2/token`,
      {
        method: 'GET',
        headers: {
          Authorization: `token ${this.accessToken}`,
          Accept: 'application/json',
          'User-Agent': 'OmniPilot-Raycast/1.0.0',
        },
      },
    );

    if (!response.ok) {
      let errorMessage = `Failed to get Copilot token: ${response.status}`;
      try {
        const errorBody = await response.text();
        const errorData = JSON.parse(errorBody);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Ignore JSON parsing errors
      }
      throw new Error(errorMessage);
    }

    const tokenData: CopilotTokenResponse = await response.json();

    // Cache the token with buffer time
    const expiresAt =
      tokenData.expires_at * 1000 - GitHubCopilotService.TOKEN_BUFFER_MS;
    this.tokenCache = {
      token: tokenData.token,
      expiresAt,
    };

    return tokenData.token;
  }

  /**
   * Validate the access token by attempting to get a Copilot token
   */
  async validateToken(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.getCopilotToken();
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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
      const copilotToken = await this.getCopilotToken();

      const streamResponse = await fetch(
        `${GitHubCopilotService.COPILOT_API_BASE}/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${copilotToken}`,
            'Content-Type': 'application/json',
            'Copilot-Integration-Id': 'vscode-chat',
            'User-Agent': 'OmniPilot-Raycast/1.0.0',
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            max_tokens: 4000,
            temperature: 0.3,
          }),
        },
      );

      if (!streamResponse.ok) {
        let errorMessage = `GitHub Copilot API error: ${streamResponse.status}`;
        try {
          const errorBody = await streamResponse.text();
          const errorData = JSON.parse(errorBody);
          errorMessage =
            errorData.error?.message || errorData.message || errorMessage;
        } catch {
          // Ignore JSON parsing errors
        }
        throw new Error(errorMessage);
      }

      if (!streamResponse.body) {
        throw new Error('No response body received from GitHub Copilot API');
      }

      // Process the streaming response
      const result = await processStreamingResponse(
        streamResponse,
        (content: string) => {
          if (options.onChunk) {
            options.onChunk(content);
          }
        },
      );

      if (options.onComplete) {
        options.onComplete(result.fullResponse, result.usage);
      }

      return result.fullResponse;
    } catch (error) {
      console.error('GitHub Copilot streaming error:', error);
      throw error;
    }
  }
}
