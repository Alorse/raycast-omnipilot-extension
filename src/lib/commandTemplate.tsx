import { useEffect, useRef, useState } from "react";
import { Detail } from "@raycast/api";
import { useAIStreaming } from "../hooks/useAIStreaming";
import { useCommandHistory } from "../hooks/useCommandHistory";
import { LLMConfigManager } from "../services/llmConfigManager";

interface CommandTemplateProps {
  userQuery: string;
  customPrompt?: string;
  customModel?: string;
}

/**
 * Reusable template for AI-powered commands
 */
export function CommandTemplate({ userQuery, customPrompt, customModel }: CommandTemplateProps) {
  const hasExecutedRef = useRef(false);
  const { response, isLoading, askAI } = useAIStreaming();
  const { addToHistory } = useCommandHistory();
  const [currentConfig, setCurrentConfig] = useState<{ model: string; provider: string; configName?: string } | null>(
    null,
  );
  const query = customPrompt ? `${customPrompt}: ${userQuery}` : userQuery;

  // Load current LLM configuration info
  useEffect(() => {
    const loadConfigInfo = async () => {
      try {
        const activeConfig = await LLMConfigManager.getActiveLLM();

        if (activeConfig) {
          setCurrentConfig({
            model: activeConfig.model,
            provider: new URL(activeConfig.apiUrl).hostname,
            configName: activeConfig.name,
          });
        } else {
          setCurrentConfig({
            model: "No configuration",
            provider: "None",
          });
        }
      } catch (error) {
        console.error("Error loading config info:", error);
        setCurrentConfig({
          model: "Error",
          provider: "Unknown",
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
  }, []);

  // Save to history when response is complete
  useEffect(() => {
    if (response && !isLoading && query && currentConfig) {
      addToHistory(query, response, currentConfig.model, currentConfig.provider, currentConfig.configName);
    }
  }, [response, isLoading, query, currentConfig, addToHistory]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={response || (query ? "" : "No query provided. Please provide a query as an argument.")}
      metadata={
        currentConfig ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Query" text={query || "No query provided"} />
            <Detail.Metadata.Label title="Model" text={currentConfig.model} />
            <Detail.Metadata.Label title="API Provider" text={currentConfig.provider} />
            {currentConfig.configName && (
              <Detail.Metadata.Label title="Configuration" text={currentConfig.configName} />
            )}
          </Detail.Metadata>
        ) : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Query" text={query || "No query provided"} />
            <Detail.Metadata.Label title="Status" text="Loading configuration..." />
          </Detail.Metadata>
        )
      }
    />
  );
}
