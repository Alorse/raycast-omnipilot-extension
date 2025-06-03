import { useEffect, useRef } from "react";
import { Detail, getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";
import { useAIStreaming } from "./hooks/useAIStreaming";
import { useCommandHistory } from "./hooks/useCommandHistory";
import { getModelToUse } from "./services/openrouter";

interface Arguments {
  query: string;
}

export default function AskAI(props: { arguments: Arguments }) {
  const preferences = getPreferenceValues<Preferences>();
  const userQuery = props.arguments.query;
  const hasExecutedRef = useRef(false);
  const { response, isLoading, askAI } = useAIStreaming();
  const { addToHistory } = useCommandHistory();

  // Get the model and API info to display
  const modelToUse = getModelToUse(preferences);
  const apiProvider = preferences.customApiUrl ? new URL(preferences.customApiUrl).hostname : "openrouter.ai";

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasExecutedRef.current) {
      return;
    }
    if (userQuery) {
      askAI(userQuery);
      hasExecutedRef.current = true;
    }
  }, []);

  // Save to history when response is complete
  useEffect(() => {
    if (response && !isLoading && userQuery) {
      addToHistory(userQuery, response, modelToUse, apiProvider);
    }
  }, [response, isLoading, userQuery, modelToUse, apiProvider, addToHistory]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        response ||
        (userQuery ? "" : "No query provided. Please provide a query as an argument.")
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Query" text={userQuery || "No query provided"} />
          <Detail.Metadata.Label title="Model" text={modelToUse} />
          <Detail.Metadata.Label title="API Provider" text={apiProvider} />
        </Detail.Metadata>
      }
    />
  );
}
