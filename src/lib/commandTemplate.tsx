import { useEffect, useRef, useState } from 'react';
import { Detail } from '@raycast/api';
import { useAIStreaming } from '../hooks/useAIStreaming';
import { useCommandHistory } from '../hooks/useCommandHistory';
import { LLMConfigManager } from '../services/llmConfigManager';
import { getProviderName } from '../utils/providers';

interface CommandTemplateProps {
  userQuery: string;
  customPrompt?: string;
  customModel?: string;
}

/**
 * Reusable template for AI-powered commands
 */
export function CommandTemplate({
  userQuery,
  customPrompt,
  customModel,
}: CommandTemplateProps) {
  const hasExecutedRef = useRef(false);
  const { response, isLoading, tokenUsage, askAI } = useAIStreaming();
  const { addToHistory } = useCommandHistory();
  const [currentConfig, setCurrentConfig] = useState<{
    model: string;
    provider: string;
    configName?: string;
  } | null>(null);
  const query = customPrompt ? `${customPrompt}: ${userQuery}` : userQuery;

  // Load current LLM configuration info
  useEffect(() => {
    const loadConfigInfo = async () => {
      try {
        const activeConfig = await LLMConfigManager.getActiveLLM();

        if (activeConfig) {
          setCurrentConfig({
            model: activeConfig.model,
            provider: getProviderName(activeConfig.apiUrl),
            configName: activeConfig.name,
          });
        } else {
          setCurrentConfig({
            model: 'No configuration',
            provider: 'None',
          });
        }
      } catch (error) {
        console.error('Error loading config info:', error);
        setCurrentConfig({
          model: 'Error',
          provider: 'Unknown',
        });
      }
    };

    loadConfigInfo();
  }, [customModel]);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasExecutedRef.current) {
      return;
    }
    if (query) {
      askAI(query, customPrompt, customModel);
      hasExecutedRef.current = true;
    }
  }, [askAI, query, customPrompt, customModel]);

  // Save to history when response is complete
  useEffect(() => {
    if (response && !isLoading && query && currentConfig) {
      addToHistory(
        query,
        response,
        currentConfig.model,
        currentConfig.provider,
        currentConfig.configName,
        tokenUsage || undefined,
      );
    }
  }, [response, isLoading, query, currentConfig, tokenUsage, addToHistory]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        response ||
        (query
          ? ''
          : 'No query provided. Please provide a query as an argument.')
      }
    />
  );
}
