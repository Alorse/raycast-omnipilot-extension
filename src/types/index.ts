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

export interface ReasoningDetail {
  type?: string;
  text?: string;
  summary?: Array<{ type?: string; text?: string }>;
}

export interface OpenRouterStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
      /** DeepSeek-style reasoning content (also used by CLI proxies) */
      reasoning_content?: string;
      /** OpenRouter-style reasoning shorthand */
      reasoning?: string;
      /** OpenAI/OpenRouter structured reasoning details */
      reasoning_details?: ReasoningDetail[];
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
  onReasoningChunk?: (reasoning: string) => void;
  onComplete?: (fullResponse: string, usage?: TokenUsage, fullReasoning?: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Extracts reasoning text from a stream chunk delta, normalizing the
 * different provider formats (reasoning_content, reasoning, reasoning_details)
 */
export function extractReasoningFromDelta(delta: NonNullable<OpenRouterStreamChunk['choices']>[0]['delta']): string {
  if (!delta) return '';

  if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
    return delta.reasoning_content;
  }

  if (typeof delta.reasoning === 'string' && delta.reasoning) {
    return delta.reasoning;
  }

  if (Array.isArray(delta.reasoning_details)) {
    return delta.reasoning_details
      .map((detail) => {
        if (typeof detail.text === 'string') return detail.text;
        if (Array.isArray(detail.summary)) {
          return detail.summary
            .map((s) => (typeof s.text === 'string' ? s.text : ''))
            .join('');
        }
        return '';
      })
      .join('');
  }

  return '';
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
