import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';

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
  getPreferenceValues: () => ({ systemPrompt: 'You are helpful.' }),
  Icon: new Proxy({}, { get: (_t, p) => String(p) }),
}));

import { useChatLogic } from '../useChatLogic';

const CONFIG_KEY = 'llm-configurations';
const ACTIVE_KEY = 'active-llm-id';
const CHAT_KEY = 'omni-pilot-chat-conversations';

function seed() {
  store.clear();
  store.set(
    CONFIG_KEY,
    JSON.stringify([
      {
        id: 'cfg-1',
        name: 'GLM',
        apiUrl: 'http://localhost:8317/v1',
        apiKey: 'sk-test',
        model: 'glm-5.3',
        isDefault: true,
        isActive: true,
      },
    ]),
  );
  store.set(ACTIVE_KEY, 'cfg-1');
}

let latest: ReturnType<typeof useChatLogic>;
function Harness() {
  latest = useChatLogic();
  return null;
}

async function settle(ms = 20) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

describe('reasoning when the whole SSE body arrives in one packet', () => {
  beforeEach(() => {
    seed();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('still persists the reasoning on the stored message', async () => {
    // A fast provider (or a local proxy) can deliver every SSE line in a
    // single chunk. Then every setState batches into one render and the
    // "mirror reasoning into a ref while isLoading" effect gets one shot.
    const enc = new TextEncoder();
    const body = [
      'data: {"choices":[{"delta":{"reasoning_content":"Let me think."}}]}',
      'data: {"choices":[{"delta":{"content":"42"}}]}',
      'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":5,"completion_tokens":2,"total_tokens":7}}',
      'data: [DONE]',
    ].join('\n') + '\n';

    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode(body));
        c.close();
      },
    });
    vi.stubGlobal('fetch', async () => new Response(stream, { status: 200 }));

    await act(async () => {
      TestRenderer.create(React.createElement(Harness));
    });
    await settle(30);

    await act(async () => {
      await latest.handleSendMessage('what is 6x7?');
    });
    await settle(150);

    const convs = JSON.parse(store.get(CHAT_KEY) || '[]');
    const msgs = convs[0]?.messages || [];
    const assistant = msgs.filter((m: { role: string }) => m.role === 'assistant');

    expect(assistant.length).toBeGreaterThan(0);
    const last = assistant[assistant.length - 1];
    expect(last.content).toBe('42');
    expect(last.reasoning).toBe('Let me think.');
  });
});
