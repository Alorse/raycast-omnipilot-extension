import { useCallback, useEffect, useRef, useState } from 'react';
import { Action, ActionPanel, Detail, Icon } from '@raycast/api';
import { useAIStreaming } from '../hooks/useAIStreaming';
import { useCommandHistory } from '../hooks/useCommandHistory';
import { LLMConfigManager } from '../services/llmConfigManager';
import { getProviderName } from '../utils/providers';
import { buildReasoningBlock } from '../utils/reasoningMarkdown';

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
  const { response, reasoning, isLoading, tokenUsage, askAI } =
    useAIStreaming();
  const { addToHistory } = useCommandHistory();
  const [showReasoning, setShowReasoning] = useState(false);
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

  // Collapse the reasoning as soon as the final answer starts arriving
  useEffect(() => {
    if (response) {
      setShowReasoning(false);
    }
  }, [response]);

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

  const toggleShowReasoning = useCallback(() => {
    setShowReasoning((prev) => !prev);
  }, []);

  const emptyState = query
    ? ''
    : 'No query provided. Please provide a query as an argument.';

  // While a reasoning model is still thinking there is no answer yet, so the
  // thinking block is all there is to show — otherwise the command looks frozen.
  const reasoningBlock = buildReasoningBlock({
    reasoning,
    isStreaming: isLoading && !response,
    showReasoning,
  });

  const markdown = [reasoningBlock, response || emptyState]
    .filter(Boolean)
    .join('\n\n');

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {response && (
            <Action.CopyToClipboard title="Copy Response" content={response} />
          )}
          {reasoning && (
            <Action
              title={showReasoning ? 'Hide Reasoning' : 'Show Reasoning'}
              icon={Icon.LightBulb}
              onAction={toggleShowReasoning}
              shortcut={{ modifiers: ['cmd'], key: 'r' }}
            />
          )}
          {reasoning && (
            <Action.CopyToClipboard
              title="Copy Reasoning"
              content={reasoning}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'r' }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
