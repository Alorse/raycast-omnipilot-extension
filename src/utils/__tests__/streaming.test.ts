import { describe, it, expect } from 'vitest';
import { extractReasoningFromDelta } from '../../types';
import { processStreamingResponse } from '../streaming';
import {
  disablePayloadFor,
  modesFromSupportedParameters,
  nextDisableMode,
  recordFailure,
  isReasoningParamError,
} from '../../utils/reasoning';

describe('reasoning disable conventions', () => {
  it('emits exactly one convention per mode', () => {
    expect(disablePayloadFor('reasoning')).toEqual({
      reasoning: { enabled: false },
    });
    expect(disablePayloadFor('effort')).toEqual({ reasoning_effort: 'none' });
    expect(disablePayloadFor('thinking')).toEqual({
      thinking: { type: 'disabled' },
    });
    expect(disablePayloadFor('enableThinking')).toEqual({
      enable_thinking: false,
    });
  });

  it('never emits two conventions at once', () => {
    for (const mode of ['reasoning', 'effort', 'thinking', 'enableThinking'] as const) {
      expect(Object.keys(disablePayloadFor(mode))).toHaveLength(1);
    }
  });
});

describe('capability-declared detection', () => {
  it('reads the convention off supported_parameters', () => {
    expect(modesFromSupportedParameters(['tools', 'reasoning'])).toEqual([
      'reasoning',
    ]);
    expect(
      modesFromSupportedParameters(['reasoning_effort', 'max_tokens']),
    ).toEqual(['effort']);
  });

  it('reports nothing to try when the list has no reasoning control', () => {
    expect(modesFromSupportedParameters(['tools', 'max_tokens'])).toEqual([]);
  });

  it('falls back to provider guessing when nothing is declared', () => {
    expect(modesFromSupportedParameters(undefined)).toBeNull();
    expect(modesFromSupportedParameters([])).toBeNull();
  });

  it('prefers what the endpoint declares over the provider guess', () => {
    // An OpenRouter model that only takes reasoning_effort
    const mode = nextDisableMode(
      'https://openrouter.ai/api/v1',
      undefined,
      ['reasoning_effort'],
    );
    expect(mode).toBe('effort');
  });

  it('sends nothing when the model declares no reasoning control', () => {
    expect(
      nextDisableMode('https://openrouter.ai/api/v1', undefined, ['tools']),
    ).toBeNull();
  });
});

describe('learning which convention works', () => {
  it('guesses per provider before anything is known', () => {
    expect(nextDisableMode('https://openrouter.ai/api/v1')).toBe('reasoning');
    expect(nextDisableMode('https://api.openai.com/v1')).toBe('effort');
    expect(nextDisableMode('http://localhost:8317/v1')).toBe('effort');
  });

  it('advances past a convention that failed', () => {
    const k = recordFailure('http://localhost:8317/v1', undefined, 'effort');
    expect(nextDisableMode('http://localhost:8317/v1', k)).toBe(
      'enableThinking',
    );
  });

  it('keeps choosing the same convention while nothing fails', () => {
    // Stability comes from the absence of failures, not from a stored winner.
    const k = recordFailure('http://localhost:8317/v1', undefined, 'effort');
    for (let i = 0; i < 5; i++) {
      expect(nextDisableMode('http://localhost:8317/v1', k)).toBe(
        'enableThinking',
      );
    }
  });

  it('does not treat a quiet answer as proof, so the choice cannot oscillate', () => {
    // A reasoning model answering something trivial emits no reasoning. That
    // must not pin the convention currently in flight.
    let k = recordFailure('http://localhost:8317/v1', undefined, 'effort');
    const chosen = nextDisableMode('http://localhost:8317/v1', k);

    // Any number of quiet responses record nothing at all
    expect(k.failed).toEqual(['effort']);
    expect(nextDisableMode('http://localhost:8317/v1', k)).toBe(chosen);

    // Only reasoning arriving anyway moves it on
    k = recordFailure('http://localhost:8317/v1', k, chosen!);
    expect(nextDisableMode('http://localhost:8317/v1', k)).not.toBe(chosen);
  });

  it('gives up once every candidate has failed', () => {
    let k = recordFailure('https://api.openai.com/v1', undefined, 'effort');
    expect(k.exhausted).toBe(true);
    expect(nextDisableMode('https://api.openai.com/v1', k)).toBeNull();

    k = undefined as never;
    let acc = undefined;
    for (const mode of ['effort', 'enableThinking', 'reasoning', 'thinking'] as const) {
      acc = recordFailure('http://localhost:8317/v1', acc, mode);
    }
    expect(acc!.exhausted).toBe(true);
    expect(nextDisableMode('http://localhost:8317/v1', acc)).toBeNull();
  });

  it('never records a winner, only losers', () => {
    const k = recordFailure('http://localhost:8317/v1', undefined, 'effort');
    expect(k).not.toHaveProperty('working');
    expect(k.failed).toEqual(['effort']);
  });
});

describe('telling a reasoning complaint from a real failure', () => {
  it('recognises provider complaints about reasoning controls', () => {
    expect(
      isReasoningParamError(
        "Conflicting thinking controls: reasoning_effort is 'low', but enable_thinking is False.",
      ),
    ).toBe(true);
    expect(
      isReasoningParamError(
        "Only one of 'reasoning' and 'reasoning_effort' may be provided",
      ),
    ).toBe(true);
    expect(
      isReasoningParamError('thinking.type disabled is not supported'),
    ).toBe(true);
  });

  it('does not retry on unrelated failures', () => {
    expect(isReasoningParamError('Insufficient credits')).toBe(false);
    expect(isReasoningParamError('invalid api key')).toBe(false);
    expect(isReasoningParamError('context length exceeded')).toBe(false);
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
