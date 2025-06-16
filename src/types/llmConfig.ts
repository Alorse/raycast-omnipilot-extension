export interface ModelInfo {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

export interface CachedModels {
  models: ModelInfo[];
  lastUpdated: Date;
  isAvailable: boolean;
  errorMessage?: string;
}

export interface LLMConfig {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  model: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  cachedModels?: CachedModels;
}

export interface LLMConfigFormData {
  name: string;
  apiUrl: string;
  apiKey: string;
  model: string;
  isDefault?: boolean;
}

export const DEFAULT_LLMS: Omit<LLMConfig, 'id' | 'apiKey'>[] = [
  {
    name: 'OpenRouter',
    apiUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.0-flash-lite-001',
    isDefault: true,
    isActive: true,
  },
  {
    name: 'GitHub Copilot',
    apiUrl: 'https://api.githubcopilot.com',
    model: 'gpt-4o',
    isDefault: false,
    isActive: false,
  },
  {
    name: 'OpenAI',
    apiUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    isDefault: false,
    isActive: false,
  },
  {
    name: 'Google Gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
    isDefault: false,
    isActive: false,
  },
  {
    name: 'Anthropic Claude',
    apiUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-haiku-20240307',
    isDefault: false,
    isActive: false,
  },
];
