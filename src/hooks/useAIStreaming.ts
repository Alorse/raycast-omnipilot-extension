import { useState, useCallback } from "react";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Preferences } from "../types";
import { createAIService, getModelToUse } from "../services/openrouter";
import { formatErrorMessage } from "../utils/errorFormatter";

interface UseAIStreamingResult {
  response: string;
  isLoading: boolean;
  error: string | null;
  askAI: (query: string, customPrompt?: string, customModel?: string) => Promise<void>;
  clearResponse: () => void;
}

/**
 * Custom hook for streaming AI responses
 * Provides an easy interface to interact with OpenRouter API
 */
export function useAIStreaming(): UseAIStreamingResult {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  const askAI = useCallback(
    async (query: string, customPrompt?: string, customModel?: string) => {
      if (!query.trim()) {
        showToast(Toast.Style.Failure, "Please provide a query");
        setError("No query provided");
        return;
      }

      setIsLoading(true);
      setError(null);
      setResponse(""); // Clear previous response

      await showToast({
        style: Toast.Style.Animated,
        title: "Waiting for AI response",
      });
      const startDate = Date.now();

      try {
        const aiService = createAIService(preferences);
        const modelToUse = getModelToUse(preferences);

        await aiService.askAI(query, customPrompt || preferences.prompt, customModel || modelToUse, {
          onChunk: (content: string) => {
            setResponse((prev) => prev + content);
          },
          onError: (apiError: Error) => {
            console.error("Error calling AI API:", apiError);
            setError(apiError.message);
            showToast(Toast.Style.Failure, "Failed to get AI response", apiError.message);

            // Format error message with helpful context
            const formattedError = formatErrorMessage(apiError.message);
            setResponse(formattedError);
          },
        });
      } catch (catchError) {
        const errorMessage = catchError instanceof Error ? catchError.message : String(catchError);
        console.error("Error in askAI:", catchError);
        setError(errorMessage);
        showToast(Toast.Style.Failure, "Failed to get AI response", errorMessage);

        // Format error message with helpful context
        const formattedError = formatErrorMessage(errorMessage);
        setResponse(formattedError);
      } finally {
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Success,
          title: "Response Finished",
          message: `${(Date.now() - startDate) / 1000} seconds`,
        });
      }
    },
    [preferences],
  );

  const clearResponse = useCallback(() => {
    setResponse("");
    setError(null);
  }, []);

  return {
    response,
    isLoading,
    error,
    askAI,
    clearResponse,
  };
}
