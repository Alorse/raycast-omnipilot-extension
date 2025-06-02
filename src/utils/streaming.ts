import { OpenRouterStreamChunk } from "../types";

/**
 * Processes a streaming response from OpenRouter API
 * @param response - The fetch response object
 * @param onChunk - Callback called for each content chunk received
 * @returns Promise that resolves with the complete response text
 */
export async function processStreamingResponse(
  response: Response,
  onChunk: (content: string) => void,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullResponse = "";

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
          } catch {
            // Ignore invalid JSON
          }
        }
      }
    }
  } finally {
    reader.cancel();
  }

  return fullResponse;
}
