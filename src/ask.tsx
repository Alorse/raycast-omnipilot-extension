import { useEffect, useRef } from "react";
import { Detail, getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";
import { useAIStreaming } from "./hooks/useAIStreaming";

interface Arguments {
  query: string;
}

export default function AskAI(props: { arguments: Arguments }) {
  const preferences = getPreferenceValues<Preferences>();
  const userQuery = props.arguments.query;
  const hasExecutedRef = useRef(false);
  const { response, isLoading, askAI } = useAIStreaming();

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

  return (
    <Detail
      isLoading={isLoading}
      markdown={response || (userQuery ? "Processing your query..." : "No query provided. Please provide a query as an argument.")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Query" text={userQuery || "No query provided"} />
          <Detail.Metadata.Label title="Model" text={preferences.defaultModel} />
        </Detail.Metadata>
      }
    />
  );
}