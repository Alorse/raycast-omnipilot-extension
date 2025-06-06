export interface Preferences {
  openrouterApiKey: string;
  prompt: string;
  defaultModel: string;
  customModel: string;
  customApiUrl: string;
  defaultTargetLanguage: string;
  secondTargetLanguage: string;
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
  usage?: TokenUsage;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface StreamingOptions {
  onChunk?: (content: string) => void;
  onComplete?: (fullResponse: string, usage?: TokenUsage) => void;
  onError?: (error: Error) => void;
}

export interface CommandHistoryEntry {
  id: string;
  timestamp: string;
  prompt: string;
  response: string;
  model: string;
  provider?: string;
  configName?: string;
  usage?: TokenUsage;
}

export interface UseCommandHistoryResult {
  history: CommandHistoryEntry[];
  isLoading: boolean;
  addToHistory: (
    prompt: string,
    response: string,
    model: string,
    provider?: string,
    configName?: string,
    usage?: TokenUsage,
  ) => Promise<void>;
  clearHistory: () => Promise<void>;
  loadHistory: () => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
}
