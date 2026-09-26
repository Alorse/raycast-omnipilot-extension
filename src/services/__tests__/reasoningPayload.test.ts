import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();

vi.mock('@raycast/api', () => ({
  LocalStorage: {
    getItem: async (k: string) => store.get(k),
    setItem: async (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: async (k: string) => {
      store.delete(k);
    },
  },
  showToast: async () => {},
  Toast: { Style: { Success: 's', Failure: 'f', Animated: 'a' } },
  getPreferenceValues: () => ({}),
}));

import { AIService } from '../openrouter';

const CONFIG_KEY = 'llm-configurations';
const ACTIVE_KEY = 'active-llm-id';

function seed(apiUrl: string, extra: Record<string, unknown> = {}) {
  store.clear();
  store.set(
    CONFIG_KEY,
    JSON.stringify([
      {
        id: 'cfg-1',
        name: 'test',
        apiUrl,
        apiKey: 'sk-test',
        model: 'glm-5.3',
        isDefault: true,
        isActive: true,
        ...extra,
      },
    ]),
  );
  store.set(ACTIVE_KEY, 'cfg-1');
}

function savedConfig() {
  return JSON.parse(store.get(CONFIG_KEY)!)[0];
}

function sseOk({ reasons = false }: { reasons?: boolean } = {}): Response {
  const lines = [
    ...(reasons
      ? ['data: {"choices":[{"delta":{"reasoning_content":"hmm"}}]}']
      : []),
    'data: {"choices":[{"delta":{"content":"hi"}}]}',
    'data: [DONE]',
  ];
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new TextEncoder().encode(lines.join('\n') + '\n'));
      c.close();
    },
  });
  return new Response(stream, { status: 200 });
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { message } }), { status });
}

let sent: Record<string, unknown>[] = [];

/** Accepts only the named convention; rejects any other the way gateways do. */
function gateway(accepts: string | null, rejection: string) {
  return async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    sent.push(body);
    const usesReasoning = 'reasoning' in body;
    const usesEffort = 'reasoning_effort' in body;
    const usesThinking = 'thinking' in body;
    const usesEnableThinking = 'enable_thinking' in body;

    const used = usesReasoning
      ? 'reasoning'
      : usesEffort
        ? 'effort'
        : usesThinking
          ? 'thinking'
          : usesEnableThinking
            ? 'enableThinking'
            : null;

    if (used === null || used === accepts) {
      return sseOk();
    }
    return errorResponse(400, rejection);
  };
}

async function run(apiUrl: string) {
  const svc = new AIService('sk-test', apiUrl);
  return svc.streamChatCompletion([{ role: 'user', content: 'hi' }], 'glm-5.3');
}

beforeEach(() => {
  sent = [];
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('reasoning enabled (default)', () => {
  it('sends no reasoning control fields at all', async () => {
    seed('https://openrouter.ai/api/v1');
    vi.stubGlobal('fetch', gateway(null, 'nope'));

    await run('https://openrouter.ai/api/v1');

    expect(sent).toHaveLength(1);
    expect(sent[0].reasoning).toBeUndefined();
    expect(sent[0].reasoning_effort).toBeUndefined();
    expect(sent[0].thinking).toBeUndefined();
    expect(sent[0].enable_thinking).toBeUndefined();
  });
});

describe('reasoning disabled', () => {
  it('never sends two conventions in the same request', async () => {
    seed('http://localhost:8317/v1', { reasoningEnabled: false });
    vi.stubGlobal('fetch', gateway('effort', 'conflict'));

    await run('http://localhost:8317/v1');

    for (const body of sent) {
      const used = [
        'reasoning',
        'reasoning_effort',
        'thinking',
        'enable_thinking',
      ].filter((k) => k in body);
      expect(used).toHaveLength(1);
    }
  });

  it('uses the OpenRouter convention on OpenRouter', async () => {
    seed('https://openrouter.ai/api/v1', { reasoningEnabled: false });
    vi.stubGlobal('fetch', gateway('reasoning', 'nope'));

    await run('https://openrouter.ai/api/v1');

    expect(sent).toHaveLength(1);
    expect(sent[0].reasoning).toEqual({ enabled: false });
    expect(sent[0].reasoning_effort).toBeUndefined();
  });

  it('recovers from the exact conflict error the user hit', async () => {
    // A gateway that only understands enable_thinking, and complains the way
    // theirs did when it saw a conflicting reasoning_effort.
    seed('http://localhost:8317/v1', { reasoningEnabled: false });
    vi.stubGlobal(
      'fetch',
      gateway(
        'enableThinking',
        "Conflicting thinking controls: reasoning_effort is 'low', but enable_thinking is False.",
      ),
    );

    const out = await run('http://localhost:8317/v1');

    expect(out).toBe('hi');
    expect(sent.length).toBeGreaterThan(1);
    expect(sent[sent.length - 1].enable_thinking).toBe(false);
  });

  it('remembers the convention that worked', async () => {
    seed('http://localhost:8317/v1', { reasoningEnabled: false });
    vi.stubGlobal('fetch', gateway('enableThinking', 'conflicting thinking'));

    await run('http://localhost:8317/v1');

    expect(savedConfig().reasoningKnowledge['glm-5.3'].failed).toEqual([
      'effort',
    ]);

    // Second call goes straight past the convention known to fail
    sent = [];
    await run('http://localhost:8317/v1');
    expect(sent).toHaveLength(1);
    expect(sent[0].enable_thinking).toBe(false);
  });

  it('learns from a provider that accepts the parameter and reasons anyway', async () => {
    // The failure mode that is invisible to HTTP status: 200 OK, no complaint,
    // and the model keeps thinking. Only the response body reveals it.
    seed('http://localhost:8317/v1', { reasoningEnabled: false });
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      sent.push(body);
      // Only enable_thinking actually silences this gateway; the rest are
      // accepted and quietly ignored.
      return sseOk({ reasons: !('enable_thinking' in body) });
    });

    // First request: guesses 'effort', gets 200 but reasoning still arrives
    await run('http://localhost:8317/v1');
    expect(sent[0].reasoning_effort).toBe('none');
    expect(savedConfig().reasoningKnowledge['glm-5.3'].failed).toContain(
      'effort',
    );

    // Second request moves on by itself — no user input, no dropdown
    sent = [];
    await run('http://localhost:8317/v1');
    expect(sent[0].enable_thinking).toBe(false);

    // Third request stays there: nothing failed, so nothing changed
    sent = [];
    await run('http://localhost:8317/v1');
    expect(sent).toHaveLength(1);
    expect(sent[0].enable_thinking).toBe(false);
  });

  it('keeps knowledge per model, not per configuration', async () => {
    seed('http://localhost:8317/v1', { reasoningEnabled: false });
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      sent.push(body);
      // glm silenced only by enable_thinking; kimi silenced by effort
      const silenced =
        body.model === 'glm-5.3'
          ? 'enable_thinking' in body
          : 'reasoning_effort' in body;
      return sseOk({ reasons: !silenced });
    });

    const svc = new AIService('sk-test', 'http://localhost:8317/v1');
    await svc.streamChatCompletion(
      [{ role: 'user', content: 'hi' }],
      'glm-5.3',
    );
    await svc.streamChatCompletion(
      [{ role: 'user', content: 'hi' }],
      'glm-5.3',
    );

    await svc.streamChatCompletion(
      [{ role: 'user', content: 'hi' }],
      'kimi-k2.5',
    );

    const k = savedConfig().reasoningKnowledge;
    // glm proved 'effort' is a no-op for it and moved on
    expect(k['glm-5.3'].failed).toEqual(['effort']);
    // kimi is silenced by the very first guess, so it never records a failure
    expect(k['kimi-k2.5']).toBeUndefined();
  });

  it('uses what the endpoint declares instead of guessing', async () => {
    seed('https://openrouter.ai/api/v1', {
      reasoningEnabled: false,
      cachedModels: {
        isAvailable: true,
        lastUpdated: new Date().toISOString(),
        models: [{ id: 'glm-5.3', supported_parameters: ['reasoning_effort'] }],
      },
    });
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => {
      sent.push(JSON.parse(init.body as string));
      return sseOk();
    });

    await run('https://openrouter.ai/api/v1');

    // Provider guess for OpenRouter would be reasoning.enabled; the declared
    // capability list wins.
    expect(sent[0].reasoning_effort).toBe('none');
    expect(sent[0].reasoning).toBeUndefined();
  });

  it('sends no control at all when the model declares none', async () => {
    seed('https://openrouter.ai/api/v1', {
      reasoningEnabled: false,
      cachedModels: {
        isAvailable: true,
        lastUpdated: new Date().toISOString(),
        models: [{ id: 'glm-5.3', supported_parameters: ['tools'] }],
      },
    });
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => {
      sent.push(JSON.parse(init.body as string));
      return sseOk();
    });

    await run('https://openrouter.ai/api/v1');

    expect(sent).toHaveLength(1);
    expect(sent[0].reasoning).toBeUndefined();
    expect(sent[0].reasoning_effort).toBeUndefined();
  });

  it('does not retry when the failure is unrelated to reasoning', async () => {
    seed('http://localhost:8317/v1', { reasoningEnabled: false });
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => {
      sent.push(JSON.parse(init.body as string));
      return errorResponse(401, 'Invalid API key');
    });

    await expect(run('http://localhost:8317/v1')).rejects.toThrow(
      /Invalid API key/,
    );
    expect(sent).toHaveLength(1);
  });

  it('surfaces the provider error when no convention is accepted', async () => {
    // e.g. GLM-5.3, which cannot have thinking disabled at all
    seed('http://localhost:8317/v1', { reasoningEnabled: false });
    vi.stubGlobal('fetch', gateway('__none__', 'thinking cannot be disabled'));

    await expect(run('http://localhost:8317/v1')).rejects.toThrow(
      /thinking cannot be disabled/,
    );
  });
});

describe('GitHub Copilot path', () => {
  it('still ignores the reasoning toggle', async () => {
    seed('https://api.githubcopilot.com', { reasoningEnabled: false });
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      if (String(url).includes('copilot_internal')) {
        return new Response(
          JSON.stringify({ token: 'tok', expires_at: 4102444800 }),
          { status: 200 },
        );
      }
      sent.push(JSON.parse(init.body as string));
      return sseOk();
    });

    const svc = new AIService('gho_test', 'https://api.githubcopilot.com');
    try {
      await svc.streamChatCompletion(
        [{ role: 'user', content: 'hi' }],
        'gpt-4o',
      );
    } catch {
      // token exchange specifics are not what this asserts
    }

    expect(sent[0]?.reasoning).toBeUndefined();
    expect(sent[0]?.reasoning_effort).toBeUndefined();
  });
});

describe('reasoning effort', () => {
  const capture =
    (respond: (body: Record<string, unknown>) => Response) =>
    async (_u: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      sent.push(body);
      return respond(body);
    };

  it('sends nothing when the effort is Default', async () => {
    seed('https://api.openai.com/v1', { reasoningEffort: 'default' });
    vi.stubGlobal(
      'fetch',
      capture(() => sseOk()),
    );

    await run('https://api.openai.com/v1');

    expect(sent).toHaveLength(1);
    expect(sent[0].reasoning_effort).toBeUndefined();
    expect(sent[0].reasoning).toBeUndefined();
  });

  it('uses reasoning.effort on OpenRouter', async () => {
    seed('https://openrouter.ai/api/v1', { reasoningEffort: 'high' });
    vi.stubGlobal(
      'fetch',
      capture(() => sseOk()),
    );

    await run('https://openrouter.ai/api/v1');

    expect(sent[0].reasoning).toEqual({ effort: 'high' });
    expect(sent[0].reasoning_effort).toBeUndefined();
  });

  it('uses reasoning_effort on OpenAI-style providers', async () => {
    seed('https://api.x.ai/v1', { reasoningEffort: 'low' });
    vi.stubGlobal(
      'fetch',
      capture(() => sseOk()),
    );

    await run('https://api.x.ai/v1');

    expect(sent[0].reasoning_effort).toBe('low');
  });

  it('uses a thinking budget on Anthropic, below max_tokens', async () => {
    seed('https://api.anthropic.com/v1', { reasoningEffort: 'medium' });
    vi.stubGlobal(
      'fetch',
      capture(() => sseOk()),
    );

    await run('https://api.anthropic.com/v1');

    const thinking = sent[0].thinking as { budget_tokens: number };
    expect(thinking).toEqual({ type: 'enabled', budget_tokens: 8192 });
    expect(sent[0].max_tokens as number).toBeGreaterThan(
      thinking.budget_tokens,
    );
    expect(sent[0].reasoning_effort).toBeUndefined();
  });

  it('moves the level onto what the model publishes', async () => {
    seed('https://openrouter.ai/api/v1', {
      reasoningEffort: 'low',
      cachedModels: {
        isAvailable: true,
        lastUpdated: new Date().toISOString(),
        models: [
          {
            id: 'glm-5.3',
            supported_parameters: ['reasoning', 'include_reasoning'],
            reasoning: { supported_efforts: ['medium', 'high', 'xhigh'] },
          },
        ],
      },
    });
    vi.stubGlobal(
      'fetch',
      capture(() => sseOk()),
    );

    await run('https://openrouter.ai/api/v1');

    expect(sent[0].reasoning).toEqual({ effort: 'medium' });
  });

  it('retries with the nearest level the provider lists in its rejection', async () => {
    seed('https://api.openai.com/v1', { reasoningEffort: 'high' });
    vi.stubGlobal(
      'fetch',
      capture((body) =>
        body.reasoning_effort === 'high'
          ? errorResponse(
              400,
              "Unsupported value: 'reasoning_effort' does not support 'high' with this model. Supported values are: 'minimal', 'low', and 'medium'.",
            )
          : sseOk(),
      ),
    );

    const out = await run('https://api.openai.com/v1');

    expect(out).toBe('hi');
    expect(sent.map((b) => b.reasoning_effort)).toEqual(['high', 'medium']);
    expect(
      savedConfig().reasoningKnowledge['glm-5.3'].supportedEfforts,
    ).toEqual(['minimal', 'low', 'medium']);

    // Learned: the next request goes straight to the accepted level
    sent = [];
    await run('https://api.openai.com/v1');
    expect(sent).toHaveLength(1);
    expect(sent[0].reasoning_effort).toBe('medium');
  });

  it('falls back to the model default when no effort is accepted', async () => {
    seed('http://localhost:8317/v1', { reasoningEffort: 'high' });
    vi.stubGlobal(
      'fetch',
      capture((body) =>
        'reasoning_effort' in body
          ? errorResponse(400, 'Unknown parameter: reasoning_effort')
          : sseOk(),
      ),
    );

    const out = await run('http://localhost:8317/v1');

    expect(out).toBe('hi');
    expect(sent).toHaveLength(2);
    expect(sent[1].reasoning_effort).toBeUndefined();
    expect(savedConfig().reasoningKnowledge['glm-5.3'].effortExhausted).toBe(
      true,
    );

    // Remembered: no more wasted round trips
    sent = [];
    await run('http://localhost:8317/v1');
    expect(sent).toHaveLength(1);
    expect(sent[0].reasoning_effort).toBeUndefined();
  });

  it('ignores the effort while reasoning is off', async () => {
    seed('https://openrouter.ai/api/v1', {
      reasoningEnabled: false,
      reasoningEffort: 'high',
    });
    vi.stubGlobal(
      'fetch',
      capture(() => sseOk()),
    );

    await run('https://openrouter.ai/api/v1');

    expect(sent[0].reasoning).toEqual({ enabled: false });
  });

  it('asks for the lowest level when thinking cannot be turned off', async () => {
    seed('https://openrouter.ai/api/v1', {
      reasoningEnabled: false,
      cachedModels: {
        isAvailable: true,
        lastUpdated: new Date().toISOString(),
        models: [
          {
            id: 'glm-5.3',
            supported_parameters: ['reasoning'],
            reasoning: {
              mandatory: true,
              supported_efforts: ['max', 'high', 'low'],
            },
          },
        ],
      },
    });
    vi.stubGlobal(
      'fetch',
      capture(() => sseOk({ reasons: true })),
    );

    await run('https://openrouter.ai/api/v1');

    expect(sent[0].reasoning).toEqual({ effort: 'low' });
    // Thinking is expected here, so it is not taken as a failed disable
    expect(savedConfig().reasoningKnowledge?.['glm-5.3']).toBeUndefined();
  });
});
