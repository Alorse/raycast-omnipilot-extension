import { useEffect, useRef } from "react";
import { Detail } from "@raycast/api";
import { Preferences } from "../types";
import { useAIStreaming } from "../hooks/useAIStreaming";
import { useCommandHistory } from "../hooks/useCommandHistory";
import { getModelToUse } from "../services/openrouter";

interface CommandTemplateProps {
  preferences: Preferences;
  userQuery: string;
  customPrompt?: string;
  customModel?: string;
}

/**
 * Reusable template for AI-powered commands
 * Handles streaming, history, and metadata display
 */
export function CommandTemplate({ 
  preferences, 
  userQuery, 
  customPrompt, 
  customModel 
}: CommandTemplateProps) {
  const hasExecutedRef = useRef(false);
  const { response, isLoading, askAI } = useAIStreaming();
  const { addToHistory } = useCommandHistory();
  const query = userQuery || customPrompt;

  // Get the model and API info to display
  const modelToUse = customModel || getModelToUse(preferences);
  const apiProvider = preferences.customApiUrl 
    ? new URL(preferences.customApiUrl).hostname 
    : "openrouter.ai";

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
    if (response && !isLoading && query) {
      addToHistory(query, response, modelToUse, apiProvider);
    }
  }, [response, isLoading, query, modelToUse, apiProvider, addToHistory]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        response ||
        (query ? "" : "No query provided. Please provide a query as an argument.")
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Query" text={query || "No query provided"} />
          <Detail.Metadata.Label title="Model" text={modelToUse} />
          <Detail.Metadata.Label title="API Provider" text={apiProvider} />
        </Detail.Metadata>
      }
    />
  );
}
