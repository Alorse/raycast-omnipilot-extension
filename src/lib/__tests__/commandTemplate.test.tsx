import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';

const store = new Map<string, string>();

/**
 * Detail is captured rather than rendered so the test can assert on the
 * markdown the command actually hands to Raycast.
 */
const detailProps: { markdown?: string; isLoading?: boolean }[] = [];

vi.mock('@raycast/api', () => {
  const Detail = (props: { markdown?: string; isLoading?: boolean }) => {
    detailProps.push(props);
    return null;
  };
  const Passthrough = () => null;
  return {
    Detail,
    ActionPanel: Passthrough,
    Action: Object.assign(Passthrough, { CopyToClipboard: Passthrough }),
    Icon: new Proxy(
      {},
      { get: (_t: unknown, p: string | symbol) => String(p) },
    ),
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
  };
});

import { CommandTemplate } from '../commandTemplate';

const CONFIG_KEY = 'llm-configurations';
const ACTIVE_KEY = 'active-llm-id';

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

async function settle(ms = 25) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

const lastMarkdown = () => detailProps[detailProps.length - 1]?.markdown ?? '';

describe('single-shot commands show thinking', () => {
  beforeEach(() => {
    seed();
    detailProps.length = 0;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('streams the reasoning live, then collapses it behind the answer', async () => {
    const s = manualStream();
    vi.stubGlobal('fetch', async () => s.response);

    await act(async () => {
      TestRenderer.create(
        React.createElement(CommandTemplate, { userQuery: 'what is 6x7?' }),
      );
    });
    await settle(40);

    s.push('data: {"choices":[{"delta":{"reasoning_content":"Six sevens."}}]}');
    await settle();

    // Visible while the model is still thinking — the command must not look frozen
    expect(lastMarkdown()).toContain('Thinking…');
    expect(lastMarkdown()).toContain('Six sevens.');

    s.push('data: {"choices":[{"delta":{"content":"42"}}]}');
    await settle();
    s.push('data: [DONE]');
    s.close();
    await settle(60);

    // Collapsed once the answer arrives
    const finalMarkdown = lastMarkdown();
    expect(finalMarkdown).toContain('42');
    expect(finalMarkdown).toContain('reasoning hidden');
    expect(finalMarkdown).not.toContain('Six sevens.');
  });

  it('shows nothing extra when the model does not reason', async () => {
    const s = manualStream();
    vi.stubGlobal('fetch', async () => s.response);

    await act(async () => {
      TestRenderer.create(
        React.createElement(CommandTemplate, { userQuery: 'hi' }),
      );
    });
    await settle(40);

    s.push('data: {"choices":[{"delta":{"content":"hello"}}]}');
    await settle();
    s.push('data: [DONE]');
    s.close();
    await settle(60);

    expect(lastMarkdown()).toBe('hello');
    expect(lastMarkdown()).not.toContain('🧠');
  });
});
