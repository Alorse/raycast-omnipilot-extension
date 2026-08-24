import { OpenRouterStreamChunk, TokenUsage, extractReasoningFromDelta } from '../types';

/**
 * Processes SSE lines and extracts content and reasoning chunks
 */
function processSSELines(
  buffer: string,
  onChunk: (content: string) => void,
  onReasoningChunk?: (reasoning: string) => void,
): { newBuffer: string; fullResponse: string; fullReasoning: string; usage?: TokenUsage } {
  let fullResponse = '';
  let fullReasoning = '';
  let usage: TokenUsage | undefined;
  let newBuffer = buffer;

  while (true) {
    const lineEnd = newBuffer.indexOf('\n');
    if (lineEnd === -1) break;

    const line = newBuffer.slice(0, lineEnd).trim();
    newBuffer = newBuffer.slice(lineEnd + 1);

    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;

      try {
        const parsed: OpenRouterStreamChunk = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        const content = delta?.content;
        if (content) {
          fullResponse += content;
          onChunk(content);
        }

        const reasoning = extractReasoningFromDelta(delta);
        if (reasoning) {
          fullReasoning += reasoning;
          onReasoningChunk?.(reasoning);
        }

        if (parsed.usage) {
          usage = parsed.usage;
        }
      } catch {
        // Ignore invalid JSON
      }
    }
  }

  return { newBuffer, fullResponse, fullReasoning, usage };
}

/**
 * Processes Node.js readable streams (node-fetch)
 */
async function processNodeStream(
  response: Response,
  onChunk: (content: string) => void,
  onReasoningChunk?: (reasoning: string) => void,
): Promise<{ fullResponse: string; fullReasoning: string; usage?: TokenUsage }> {
  const nodeStream = response.body as unknown as AsyncIterable<Buffer>;
  let buffer = '';
  let fullResponse = '';
  let fullReasoning = '';
  let usage: TokenUsage | undefined;

  for await (const chunk of nodeStream) {
    const chunkStr = Buffer.isBuffer(chunk)
      ? chunk.toString('utf8')
      : String(chunk);
    buffer += chunkStr;

    const result = processSSELines(buffer, onChunk, onReasoningChunk);
    buffer = result.newBuffer;
    fullResponse += result.fullResponse;
    fullReasoning += result.fullReasoning;
    if (result.usage) {
      usage = result.usage;
    }
  }

  return { fullResponse, fullReasoning, usage };
}

/**
 * Processes Web ReadableStream (browser fetch)
 */
async function processWebStream(
  response: Response,
  onChunk: (content: string) => void,
  onReasoningChunk?: (reasoning: string) => void,
): Promise<{ fullResponse: string; fullReasoning: string; usage?: TokenUsage }> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullResponse = '';
  let fullReasoning = '';
  let usage: TokenUsage | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const result = processSSELines(buffer, onChunk, onReasoningChunk);
      buffer = result.newBuffer;
      fullResponse += result.fullResponse;
      fullReasoning += result.fullReasoning;
      if (result.usage) {
        usage = result.usage;
      }
    }
  } finally {
    reader.cancel();
  }

  return { fullResponse, fullReasoning, usage };
}

/**
 * Processes a streaming response from OpenRouter API
 * @param response - The fetch response object
 * @param onChunk - Callback called for each content chunk received
 * @param onReasoningChunk - Optional callback called for each reasoning chunk received
 * @returns Promise that resolves with an object containing the complete response text, reasoning text and token usage
 */
export async function processStreamingResponse(
  response: Response,
  onChunk: (content: string) => void,
  onReasoningChunk?: (reasoning: string) => void,
): Promise<{ fullResponse: string; fullReasoning: string; usage?: TokenUsage }> {
  if (!response.body) {
    throw new Error('Response body is not available');
  }

  try {
    // Check if this is a Node.js readable stream (node-fetch) or web ReadableStream
    if (typeof response.body.getReader !== 'function') {
      // This is a Node.js readable stream
      return await processNodeStream(response, onChunk, onReasoningChunk);
    } else {
      // This is a web ReadableStream
      return await processWebStream(response, onChunk, onReasoningChunk);
    }
  } catch (error) {
    console.error('Error processing streaming response:', error);
    throw error;
  }
}
