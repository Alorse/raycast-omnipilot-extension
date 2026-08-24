import { useState, useCallback, useRef } from 'react';
import { showToast, Toast } from '@raycast/api';
import {
  createAIServiceFromConfig,
  getActiveModel,
} from '../services/openrouter';
import { formatErrorMessage } from '../utils/errorFormatter';
import { TokenUsage, OpenRouterMessage } from '../types';

interface UseAIStreamingResult {
  response: string;
  /** Reasoning/thinking tokens streamed by reasoning models */
  reasoning: string;
  isLoading: boolean;
  error: string | null;
  tokenUsage: TokenUsage | null;
  askAI: (
    query: string,
    customPrompt?: string,
    customModel?: string,
  ) => Promise<void>;
  chatWithHistory: (
    messages: OpenRouterMessage[],
    customModel?: string,
  ) => Promise<void>;
  clearResponse: () => void;
}

/**
 * Custom hook for streaming AI responses
 */
export function useAIStreaming(): UseAIStreamingResult {
  const [response, setResponse] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);

  // Keep the latest full reasoning so onComplete consumers can read it
  const reasoningRef = useRef('');

  const resetStreamState = useCallback(() => {
    setResponse('');
    setReasoning('');
    setTokenUsage(null);
    reasoningRef.current = '';
  }, []);

  const makeStreamCallbacks = useCallback(
    () => ({
      onChunk: (content: string) => {
        setResponse((prev) => prev + content);
      },
      onReasoningChunk: (chunk: string) => {
        reasoningRef.current += chunk;
        setReasoning((prev) => prev + chunk);
      },
      onComplete: (fullResponse: string, usage?: TokenUsage) => {
        if (usage) {
          setTokenUsage(usage);
        }
      },
      onError: (apiError: Error) => {
        console.error('Error calling AI API:', apiError);
        setError(apiError.message);
        showToast(
          Toast.Style.Failure,
          'Failed to get AI response',
          apiError.message,
        );

        // Format error message with helpful context
        const formattedError = formatErrorMessage(apiError.message);
        setResponse(formattedError);
      },
    }),
    [],
  );

  const askAI = useCallback(
    async (query: string, customPrompt?: string, customModel?: string) => {
      if (!query.trim()) {
        showToast(Toast.Style.Failure, 'Please provide a query');
        setError('No query provided');
        return;
      }

      setIsLoading(true);
      setError(null);
      resetStreamState();

      await showToast({
        style: Toast.Style.Animated,
        title: 'Waiting for AI response',
      });
      const startDate = Date.now();

      try {
        const aiService = await createAIServiceFromConfig();
        const modelToUse = customModel || (await getActiveModel());

        await aiService.askAI(
          query,
          customPrompt || 'You are a helpful AI assistant.',
          modelToUse,
          makeStreamCallbacks(),
        );
      } catch (catchError) {
        const errorMessage =
          catchError instanceof Error ? catchError.message : String(catchError);
        console.error('Error in askAI:', catchError);
        setError(errorMessage);
        showToast(
          Toast.Style.Failure,
          'Failed to get AI response',
          errorMessage,
        );

        // Format error message with helpful context
        const formattedError = formatErrorMessage(errorMessage);
        setResponse(formattedError);
      } finally {
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Success,
          title: 'Response Finished',
          message: `${(Date.now() - startDate) / 1000} seconds`,
        });
      }
    },
    [makeStreamCallbacks, resetStreamState],
  );

  const chatWithHistory = useCallback(
    async (messages: OpenRouterMessage[], customModel?: string) => {
      if (!messages.length) {
        showToast(Toast.Style.Failure, 'No messages provided');
        setError('No messages provided');
        return;
      }

      setIsLoading(true);
      setError(null);
      resetStreamState();

      await showToast({
        style: Toast.Style.Animated,
        title: 'Waiting for AI response',
      });
      const startDate = Date.now();

      try {
        const aiService = await createAIServiceFromConfig();
        const modelToUse = customModel || (await getActiveModel());

        await aiService.streamChatCompletion(
          messages,
          modelToUse,
          makeStreamCallbacks(),
        );
      } catch (catchError) {
        const errorMessage =
          catchError instanceof Error ? catchError.message : String(catchError);
        console.error('Error in chatWithHistory:', catchError);
        setError(errorMessage);
        showToast(
          Toast.Style.Failure,
          'Failed to get AI response',
          errorMessage,
        );

        // Format error message with helpful context
        const formattedError = formatErrorMessage(errorMessage);
        setResponse(formattedError);
      } finally {
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Success,
          title: 'Response Finished',
          message: `${(Date.now() - startDate) / 1000} seconds`,
        });
      }
    },
    [makeStreamCallbacks, resetStreamState],
  );

  const clearResponse = useCallback(() => {
    resetStreamState();
    setError(null);
  }, [resetStreamState]);

  return {
    response,
    reasoning,
    isLoading,
    error,
    tokenUsage,
    askAI,
    chatWithHistory,
    clearResponse,
  };
}
