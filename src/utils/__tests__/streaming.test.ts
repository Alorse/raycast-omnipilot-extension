import { describe, it, expect } from 'vitest';
import { extractReasoningFromDelta } from '../../types';
import { processStreamingResponse } from '../streaming';
import { buildReasoningDisablePayload } from '../../utils/reasoning';

describe('buildReasoningDisablePayload', () => {
  it('sends both OpenRouter and effort-based disable conventions', () => {
    expect(buildReasoningDisablePayload()).toEqual({
      reasoning: { enabled: false },
      reasoning_effort: 'none',
    });
  });
});

function sseResponse(lines: string[]): Response {
  const body = lines.join('\n') + '\n';
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(body));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe('extractReasoningFromDelta', () => {
  it('extracts reasoning_content (DeepSeek / CLI proxy format)', () => {
    const out = extractReasoningFromDelta({ reasoning_content: 'thinking…' });
    expect(out).toBe('thinking…');
  });

  it('extracts reasoning (OpenRouter shorthand)', () => {
    const out = extractReasoningFromDelta({ reasoning: 'step by step' });
    expect(out).toBe('step by step');
  });

  it('prefers reasoning_content over reasoning', () => {
    const out = extractReasoningFromDelta({
      reasoning_content: 'first',
      reasoning: 'second',
    });
    expect(out).toBe('first');
  });

  it('extracts structured reasoning_details with text', () => {
    const out = extractReasoningFromDelta({
      reasoning_details: [{ type: 'reasoning.text', text: 'let me think' }],
    });
    expect(out).toBe('let me think');
  });

  it('extracts reasoning_details with nested summary array', () => {
    const out = extractReasoningFromDelta({
      reasoning_details: [
        {
          type: 'reasoning.summary',
          summary: [
            { type: 'summary_text', text: 'part1' },
            { type: 'summary_text', text: ' part2' },
          ],
        },
      ],
    });
    expect(out).toBe('part1 part2');
  });

  it('returns empty string for content-only deltas', () => {
    expect(extractReasoningFromDelta({ content: 'answer' })).toBe('');
    expect(extractReasoningFromDelta(undefined)).toBe('');
    expect(extractReasoningFromDelta({})).toBe('');
  });
});

describe('processStreamingResponse', () => {
  it('separates content and reasoning chunks (reasoning_content format)', async () => {
    const chunks: string[] = [];
    const reasoningChunks: string[] = [];

    const response = sseResponse([
      'data: {"choices":[{"delta":{"reasoning_content":"7*8="}}]}',
      'data: {"choices":[{"delta":{"reasoning_content":"56"}}]}',
      'data: {"choices":[{"delta":{"content":"56"}}]}',
      'data: {"usage":{"prompt_tokens":1,"completion_tokens":5,"total_tokens":6}}',
      'data: [DONE]',
    ]);

    const result = await processStreamingResponse(
      response,
      (c) => chunks.push(c),
      (r) => reasoningChunks.push(r),
    );

    expect(chunks).toEqual(['56']);
    expect(reasoningChunks).toEqual(['7*8=', '56']);
    expect(result.fullResponse).toBe('56');
    expect(result.fullReasoning).toBe('7*8=56');
    expect(result.usage?.total_tokens).toBe(6);
  });

  it('handles OpenRouter reasoning shorthand', async () => {
    const reasoningChunks: string[] = [];

    const response = sseResponse([
      'data: {"choices":[{"delta":{"reasoning":"pondering"}}]}',
      'data: {"choices":[{"delta":{"content":"answer"}}]}',
      'data: [DONE]',
    ]);

    const result = await processStreamingResponse(
      response,
      () => {},
      (r) => reasoningChunks.push(r),
    );

    expect(reasoningChunks).toEqual(['pondering']);
    expect(result.fullReasoning).toBe('pondering');
    expect(result.fullResponse).toBe('answer');
  });

  it('handles chunks split across multiple SSE events', async () => {
    const response = sseResponse([
      'data: {"choices":[{"delta":{"reasoning_content":"a"}}]}',
      'data: {"choices":[{"delta":{"reasoning_content":"b"}}]}',
      'data: {"choices":[{"delta":{"content":"c1"}}]}',
      'data: {"choices":[{"delta":{"content":"c2"}}]}',
      'data: [DONE]',
    ]);

    const result = await processStreamingResponse(response, () => {});
    expect(result.fullResponse).toBe('c1c2');
    expect(result.fullReasoning).toBe('ab');
  });

  it('works without an onReasoningChunk callback', async () => {
    const response = sseResponse([
      'data: {"choices":[{"delta":{"reasoning_content":"hidden thinking"}}]}',
      'data: {"choices":[{"delta":{"content":"ok"}}]}',
      'data: [DONE]',
    ]);

    const result = await processStreamingResponse(response, () => {});
    expect(result.fullReasoning).toBe('hidden thinking');
    expect(result.fullResponse).toBe('ok');
  });

  it('ignores invalid JSON lines without failing', async () => {
    const response = sseResponse([
      'data: not-json',
      'data: {"choices":[{"delta":{"content":"still works"}}]}',
      'data: [DONE]',
    ]);

    const result = await processStreamingResponse(response, () => {});
    expect(result.fullResponse).toBe('still works');
    expect(result.fullReasoning).toBe('');
  });
});
