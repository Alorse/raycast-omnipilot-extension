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

/**
 * A stream the test drives manually, so React can render between chunks —
 * which is what actually happens in Raycast during live streaming.
 */
function manualStream() {
  const enc = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    response: new Response(stream, { status: 200 }),
    push: (line: string) => controller!.enqueue(enc.encode(line + '\n')),
    close: () => controller!.close(),
  };
}

let latest: ReturnType<typeof useChatLogic>;
const renders: string[] = [];
function Harness() {
  latest = useChatLogic();
  const s = latest.allMessages.find((m) => m.id === 'streaming');
  renders.push(
    s ? `streaming c=${JSON.stringify(s.content)} r=${JSON.stringify(s.reasoning)}` : 'no-streaming-msg',
  );
  return null;
}

/** Lets pending microtasks + timers flush with React rendering in between. */
async function settle(ms = 20) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

describe('reasoning end-to-end with real per-chunk rendering', () => {
  beforeEach(() => {
    seed();
    renders.length = 0;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders reasoning live, then persists it on the stored message', async () => {
    const s = manualStream();
    vi.stubGlobal('fetch', async () => s.response);

    await act(async () => {
      TestRenderer.create(React.createElement(Harness));
    });
    await settle(30);

    // Fire the send but do NOT await it inside one act — drive the stream below
    let sendPromise: Promise<void>;
    await act(async () => {
      sendPromise = latest.handleSendMessage('what is 6x7?');
      await new Promise((r) => setTimeout(r, 10));
    });

    s.push('data: {"choices":[{"delta":{"reasoning_content":"Let me "}}]}');
    await settle();
    s.push('data: {"choices":[{"delta":{"reasoning_content":"think about it."}}]}');
    await settle();

    // Live reasoning must be visible while streaming
    const liveMarkdown = latest.chatMarkdown;
    expect(liveMarkdown).toContain('Thinking');
    expect(liveMarkdown).toContain('Let me think about it.');

    s.push('data: {"choices":[{"delta":{"content":"42"}}]}');
    await settle();
    s.push(
      'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":5,"completion_tokens":2,"total_tokens":7}}',
    );
    await settle();
    s.push('data: [DONE]');
    s.close();
    await settle(50);
    await act(async () => {
      await sendPromise!;
    });
    await settle(80);

    const convs = JSON.parse(store.get(CHAT_KEY) || '[]');
    const msgs = convs[0]?.messages || [];
    const assistant = msgs.filter((m: { role: string }) => m.role === 'assistant');

    expect(assistant.length).toBeGreaterThan(0);
    const last = assistant[assistant.length - 1];
    expect(last.content).toBe('42');
    expect(last.reasoning).toBe('Let me think about it.');
  });

  it('collapses reasoning after completion and expands it with the toggle', async () => {
    const s = manualStream();
    vi.stubGlobal('fetch', async () => s.response);

    await act(async () => {
      TestRenderer.create(React.createElement(Harness));
    });
    await settle(30);

    let sendPromise: Promise<void>;
    await act(async () => {
      sendPromise = latest.handleSendMessage('what is 6x7?');
      await new Promise((r) => setTimeout(r, 10));
    });

    s.push('data: {"choices":[{"delta":{"reasoning_content":"Deep thought."}}]}');
    await settle();
    s.push('data: {"choices":[{"delta":{"content":"42"}}]}');
    await settle();
    s.push('data: [DONE]');
    s.close();
    await settle(50);
    await act(async () => {
      await sendPromise!;
    });
    await settle(80);

    expect(latest.hasReasoning).toBe(true);
    expect(latest.showReasoning).toBe(false);
    expect(latest.chatMarkdown).toContain('reasoning hidden');
    expect(latest.chatMarkdown).not.toContain('Deep thought.');

    await act(async () => {
      latest.toggleShowReasoning();
    });
    expect(latest.chatMarkdown).toContain('Deep thought.');
  });
});
