/**
 * LLM Provider information with branding and identification
 */
interface ProviderInfo {
  id: string;
  name: string;
  displayName: string;
  color: string;
  icon?: string;
  hostnames: string[]; // Common hostnames/domains for detection
  isDefaultProvider?: boolean;
}

/**
 * Complete list of supported LLM providers with their branding information
 */
const PROVIDERS: ProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    displayName: 'OpenAI',
    color: '#10A37F',
    icon: 'openai.svg',
    hostnames: ['api.openai.com', 'openai.com'],
    isDefaultProvider: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    displayName: 'Anthropic',
    color: '#D97706',
    icon: 'anthropic.svg',
    hostnames: ['api.anthropic.com', 'anthropic.com'],
  },
  {
    id: 'google',
    name: 'Google',
    displayName: 'Google Gemini',
    color: '#4285F4',
    icon: 'google.svg',
    hostnames: ['generativelanguage.googleapis.com', 'google.com', 'ai.google'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    displayName: 'OpenRouter',
    color: '#8B5CF6',
    icon: 'openrouter.svg',
    hostnames: ['openrouter.ai'],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    displayName: 'Mistral AI',
    color: '#FF6B6B',
    icon: 'mistral.svg',
    hostnames: ['api.mistral.ai', 'mistral.ai'],
  },
  {
    id: 'cohere',
    name: 'Cohere',
    displayName: 'Cohere',
    color: '#39C5BB',
    icon: 'cohere.svg',
    hostnames: ['api.cohere.ai', 'cohere.ai'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    displayName: 'DeepSeek',
    color: '#1E293B',
    icon: 'deepseek.svg',
    hostnames: ['api.deepseek.com', 'deepseek.com'],
  },
  {
    id: 'xai',
    name: 'xAI',
    displayName: 'xAI (Grok)',
    color: '#000000',
    icon: 'xai.svg',
    hostnames: ['api.x.ai', 'x.ai'],
  },
  {
    id: 'meta',
    name: 'Meta',
    displayName: 'Meta Llama',
    color: '#1877F2',
    icon: 'meta.svg',
    hostnames: ['meta.ai', 'llama.meta.com'],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA',
    displayName: 'NVIDIA',
    color: '#76B900',
    icon: 'nvidia.svg',
    hostnames: ['api.nvidia.com', 'nvidia.com'],
  },
  {
    id: 'nous',
    name: 'Nous Research',
    displayName: 'Nous Research',
    color: '#EF4444',
    icon: 'nous.svg',
    hostnames: ['inference-api.nousresearch.com', 'nousresearch.com'],
  },
  {
    id: 'asi1',
    name: 'ASI:ONE',
    displayName: 'ASI:ONE',
    color: '#10B981',
    icon: 'asi1.svg',
    hostnames: ['api.asi1.ai', 'asi1.ai'],
  },
  {
    id: 'aionlabs',
    name: 'AionLabs',
    displayName: 'AionLabs',
    color: '#8B5A3C',
    icon: 'aionlabs.svg',
    hostnames: ['api.aionlabs.ai', 'aionlabs.ai'],
  },
  {
    id: 'alibaba',
    name: 'Alibaba',
    displayName: 'Alibaba Qwen',
    color: '#FF6A00',
    icon: 'qwen.svg',
    hostnames: ['dashscope.aliyuncs.com', 'qwen.alibaba.com', 'alibaba.com'],
  },
];

/**
 * Default provider info for unknown/unmatched providers
 */
const DEFAULT_PROVIDER: ProviderInfo = {
  id: 'unknown',
  name: 'Unknown',
  displayName: 'Custom Provider',
  color: '#6B7280',
  icon: 'unknown.svg',
  hostnames: [],
};

/**
 * Detect provider information from an API URL or hostname
 * @param input - API URL string or hostname
 * @returns ProviderInfo object with provider details
 */
function detectProvider(input: string): ProviderInfo {
  if (!input) {
    return DEFAULT_PROVIDER;
  }

  let hostname = input;

  // Extract hostname from URL if needed
  try {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      hostname = new URL(input).hostname;
    }
  } catch {
    // If URL parsing fails, treat as hostname
    hostname = input.toLowerCase();
  }

  // Find matching provider by hostname
  for (const provider of PROVIDERS) {
    if (provider.hostnames.some((h) => hostname.includes(h.toLowerCase()))) {
      return provider;
    }
  }

  // Check for partial matches in provider names (fallback)
  const lowerInput = input.toLowerCase();
  for (const provider of PROVIDERS) {
    if (
      lowerInput.includes(provider.name.toLowerCase()) ||
      lowerInput.includes(provider.id.toLowerCase())
    ) {
      return provider;
    }
  }

  return DEFAULT_PROVIDER;
}

/**
 * Get provider color for UI elements
 * @param input - Provider ID, hostname, or URL
 * @returns Color hex string
 */
export function getProviderColor(input?: string): string {
  if (!input) {
    return DEFAULT_PROVIDER.color;
  }

  const provider = detectProvider(input);
  return provider.color;
}

/**
 * Get provider display name for UI elements
 * @param input - Provider ID, hostname, or URL
 * @returns Human-readable provider name
 */
export function getProviderName(input?: string): string {
  if (!input) {
    return DEFAULT_PROVIDER.displayName;
  }

  const provider = detectProvider(input);
  return provider.displayName;
}

/**
 * Get provider icon path for UI elements
 * @param input - Provider ID, hostname, or URL
 * @returns Icon path string
 */
export function getProviderIcon(input?: string): string {
  if (!input) {
    return DEFAULT_PROVIDER.icon || 'unknown.svg';
  }

  const provider = detectProvider(input);
  return provider.icon || DEFAULT_PROVIDER.icon || 'unknown.svg';
}
