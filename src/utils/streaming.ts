import { OpenRouterStreamChunk, TokenUsage } from "../types";

/**
 * Processes a streaming response from OpenRouter API
 * @param response - The fetch response object
 * @param onChunk - Callback called for each content chunk received
 * @returns Promise that resolves with an object containing the complete response text and token usage
 */
export async function processStreamingResponse(
  response: Response,
  onChunk: (content: string) => void,
): Promise<{ fullResponse: string; usage?: TokenUsage }> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullResponse = "";
  let usage: TokenUsage | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Append new chunk to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines from buffer
      while (true) {
        const lineEnd = buffer.indexOf("\n");
        if (lineEnd === -1) break;

        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed: OpenRouterStreamChunk = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              onChunk(content);
            }

            // Check for usage information in the chunk
            if (parsed.usage) {
              usage = parsed.usage;
            }
          } catch {
            // Ignore invalid JSON
          }
        }
      }
    }
  } finally {
    reader.cancel();
  }

  return { fullResponse, usage };
}
