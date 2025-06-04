import { Icon } from "@raycast/api";

/**
 * LLM Provider information with branding and identification
 */
export interface ProviderInfo {
  id: string;
  name: string;
  displayName: string;
  color: string;
  icon?: Icon; // Will be populated later with specific provider icons
  hostnames: string[]; // Common hostnames/domains for detection
  isDefaultProvider?: boolean;
}

/**
 * Complete list of supported LLM providers with their branding information
 */
export const PROVIDERS: ProviderInfo[] = [
  {
    id: "openai",
    name: "OpenAI",
    displayName: "OpenAI",
    color: "#10A37F",
    hostnames: ["api.openai.com", "openai.com"],
    isDefaultProvider: true,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    displayName: "Anthropic",
    color: "#D97706",
    hostnames: ["api.anthropic.com", "anthropic.com"],
  },
  {
    id: "google",
    name: "Google",
    displayName: "Google Gemini",
    color: "#4285F4",
    hostnames: ["generativelanguage.googleapis.com", "google.com", "ai.google"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    displayName: "OpenRouter",
    color: "#8B5CF6",
    hostnames: ["openrouter.ai"],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    displayName: "Mistral AI",
    color: "#FF6B6B",
    hostnames: ["api.mistral.ai", "mistral.ai"],
  },
  {
    id: "cohere",
    name: "Cohere",
    displayName: "Cohere",
    color: "#39C5BB",
    hostnames: ["api.cohere.ai", "cohere.ai"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    displayName: "DeepSeek",
    color: "#1E293B",
    hostnames: ["api.deepseek.com", "deepseek.com"],
  },
  {
    id: "xai",
    name: "xAI",
    displayName: "xAI (Grok)",
    color: "#000000",
    hostnames: ["api.x.ai", "x.ai"],
  },
  {
    id: "meta",
    name: "Meta",
    displayName: "Meta Llama",
    color: "#1877F2",
    hostnames: ["meta.ai", "llama.meta.com"],
  },
  {
    id: "nvidia",
    name: "NVIDIA",
    displayName: "NVIDIA",
    color: "#76B900",
    hostnames: ["api.nvidia.com", "nvidia.com"],
  },
  {
    id: "nous",
    name: "Nous Research",
    displayName: "Nous Research",
    color: "#EF4444",
    hostnames: ["inference-api.nousresearch.com", "nousresearch.com"],
  },
  {
    id: "asi1",
    name: "ASI:ONE",
    displayName: "ASI:ONE",
    color: "#10B981",
    hostnames: ["api.asi1.ai", "asi1.ai"],
  },
  {
    id: "aionlabs",
    name: "AionLabs",
    displayName: "AionLabs",
    color: "#8B5A3C",
    hostnames: ["api.aionlabs.ai", "aionlabs.ai"],
  },
];

/**
 * Default provider info for unknown/unmatched providers
 */
export const DEFAULT_PROVIDER: ProviderInfo = {
  id: "unknown",
  name: "Unknown",
  displayName: "Custom Provider",
  color: "#6B7280",
  hostnames: [],
};

/**
 * Detect provider information from an API URL or hostname
 * @param input - API URL string or hostname
 * @returns ProviderInfo object with provider details
 */
export function detectProvider(input: string): ProviderInfo {
  if (!input) {
    return DEFAULT_PROVIDER;
  }

  let hostname = input;
  
  // Extract hostname from URL if needed
  try {
    if (input.startsWith("http://") || input.startsWith("https://")) {
      hostname = new URL(input).hostname;
    }
  } catch {
    // If URL parsing fails, treat as hostname
    hostname = input.toLowerCase();
  }

  // Find matching provider by hostname
  for (const provider of PROVIDERS) {
    if (provider.hostnames.some(h => hostname.includes(h.toLowerCase()))) {
      return provider;
    }
  }

  // Check for partial matches in provider names (fallback)
  const lowerInput = input.toLowerCase();
  for (const provider of PROVIDERS) {
    if (lowerInput.includes(provider.name.toLowerCase()) || 
        lowerInput.includes(provider.id.toLowerCase())) {
      return provider;
    }
  }

  return DEFAULT_PROVIDER;
}

/**
 * Get provider information by ID
 * @param providerId - Provider ID to lookup
 * @returns ProviderInfo object or default provider if not found
 */
export function getProviderById(providerId: string): ProviderInfo {
  const provider = PROVIDERS.find(p => p.id === providerId);
  return provider || DEFAULT_PROVIDER;
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
 * Get all available providers (useful for dropdowns, lists, etc.)
 * @returns Array of all supported providers
 */
export function getAllProviders(): ProviderInfo[] {
  return [...PROVIDERS];
}

/**
 * Check if a provider is officially supported
 * @param input - Provider ID, hostname, or URL
 * @returns true if provider is officially supported
 */
export function isOfficialProvider(input: string): boolean {
  const provider = detectProvider(input);
  return provider.id !== DEFAULT_PROVIDER.id;
}
