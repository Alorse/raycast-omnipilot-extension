export interface Preferences {
  openrouterApiKey: string;
  prompt: string;
  defaultModel: string;
  customModel: string;
  customApiUrl: string;
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

export interface StreamingOptions {
  onChunk?: (content: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}
