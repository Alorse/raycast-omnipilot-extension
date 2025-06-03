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
  role: "system" | "user" | "assistant";
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

export interface CommandHistoryEntry {
  id: string;
  timestamp: string;
  prompt: string;
  response: string;
  model: string;
  provider?: string;
}

export interface UseCommandHistoryResult {
  history: CommandHistoryEntry[];
  isLoading: boolean;
  addToHistory: (prompt: string, response: string, model: string, provider?: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  loadHistory: () => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
}
