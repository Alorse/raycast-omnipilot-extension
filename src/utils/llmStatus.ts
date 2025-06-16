import { LLMConfigManager } from '../services/llmConfigManager';
import { LLMConfig } from '../types/llmConfig';
import { getProviderName } from './providers';
import { GitHubCopilotService } from '../services/githubCopilot';

/**
 * Get a summary of the current LLM configuration status
 * Useful for debugging and user information
 */
export async function getLLMStatus(): Promise<{
  totalConfigs: number;
  activeConfig: LLMConfig | null;
  hasValidConfigs: boolean;
  configsWithKeys: number;
  status: string;
}> {
  try {
    const configs = await LLMConfigManager.getAllConfigs();
    const activeConfig = await LLMConfigManager.getActiveLLM();
    const configsWithKeys = configs.filter(
      (c) => c.apiKey && c.apiKey.length > 0,
    ).length;

    let status = 'Ready';
    if (configs.length === 0) {
      status = 'No configurations found';
    } else if (configsWithKeys === 0) {
      status = 'No API keys configured';
    } else if (!activeConfig) {
      status = 'No active configuration selected';
    } else if (!activeConfig.apiKey) {
      status = 'Active configuration missing API key';
    }

    return {
      totalConfigs: configs.length,
      activeConfig,
      hasValidConfigs: configsWithKeys > 0,
      configsWithKeys,
      status,
    };
  } catch (error) {
    console.error('Error getting LLM status:', error);
    return {
      totalConfigs: 0,
      activeConfig: null,
      hasValidConfigs: false,
      configsWithKeys: 0,
      status: 'Error loading configurations',
    };
  }
}

/**
 * Get a user-friendly description of the current LLM setup
 */
export async function getLLMStatusDescription(): Promise<string> {
  const status = await getLLMStatus();

  if (status.totalConfigs === 0) {
    return "No LLM configurations found. Use 'Manage LLMs' to add one.";
  }

  if (status.configsWithKeys === 0) {
    return `${status.totalConfigs} configuration(s) found, but no API keys are set. Use 'Manage LLMs' to add your API keys.`;
  }

  if (!status.activeConfig) {
    return `${status.configsWithKeys} valid configuration(s) available, but none is active. Use 'Manage LLMs' to set an active configuration.`;
  }

  if (!status.activeConfig.apiKey) {
    return `Active configuration "${status.activeConfig.name}" is missing an API key. Use 'Manage LLMs' to update it.`;
  }

  return `Using "${status.activeConfig.name}" with model "${status.activeConfig.model}" via ${getProviderName(status.activeConfig.apiUrl)}`;
}

/**
 * Validate a specific LLM configuration
 * @param config - The LLM configuration to validate
 * @returns Promise with validation result
 */
export async function validateLLMConfig(config: LLMConfig): Promise<{
  valid: boolean;
  error?: string;
}> {
  if (!config.apiKey || config.apiKey.trim() === '') {
    return { valid: false, error: 'API key is required' };
  }

  // Special validation for GitHub Copilot
  if (
    config.name === 'GitHub Copilot' ||
    config.apiUrl?.includes('githubcopilot.com') ||
    config.apiUrl?.includes('api.github.com')
  ) {
    try {
      const copilotService = new GitHubCopilotService(config.apiKey);
      return await copilotService.validateToken();
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Error
            ? error.message
            : 'GitHub Copilot validation failed',
      };
    }
  }

  // For other providers, just check if API key exists
  return { valid: true };
}
