import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';

// ---- in-memory LocalStorage backing the Raycast API mock ----
const store = new Map<string, string>();

const toasts: Array<{ title?: string; message?: string }> = [];

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
  showToast: async (t: unknown) => {
    toasts.push(t as { title?: string });
    return t;
  },
  Toast: { Style: { Success: 'success', Failure: 'failure', Animated: 'animated' } },
  getPreferenceValues: () => ({ systemPrompt: 'You are helpful.' }),
  Icon: new Proxy({}, { get: (_t, p) => String(p) }),
}));

import { useChatLogic } from '../useChatLogic';

const CONFIG_KEY = 'llm-configurations';
const ACTIVE_KEY = 'active-llm-id';

function seedConfig(reasoningEnabled?: boolean) {
  store.clear();
  toasts.length = 0;
  const cfg = {
    id: 'cfg-1',
    name: 'GLM via proxy',
    apiUrl: 'http://localhost:8317/v1',
    apiKey: 'sk-test',
    model: 'glm-5.3',
    isDefault: true,
    isActive: true,
    ...(reasoningEnabled === undefined ? {} : { reasoningEnabled }),
  };
  store.set(CONFIG_KEY, JSON.stringify([cfg]));
  store.set(ACTIVE_KEY, 'cfg-1');
}

// Harness component that surfaces the hook's return value
let latest: ReturnType<typeof useChatLogic>;
function Harness() {
  latest = useChatLogic();
  return null;
}

async function mount() {
  await act(async () => {
    TestRenderer.create(React.createElement(Harness));
  });
  // let the async init effect settle
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
}

describe('reasoning toggle — UI state after toggling', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('defaults to reasoningEnabled=true when the config has no flag', async () => {
    seedConfig(undefined);
    await mount();
    expect(latest.reasoningEnabled).toBe(true);
  });

  it('persists the new value to storage when toggled', async () => {
    seedConfig(undefined);
    await mount();

    await act(async () => {
      await latest.toggleReasoningEnabled();
    });

    const saved = JSON.parse(store.get(CONFIG_KEY)!)[0];
    expect(saved.reasoningEnabled).toBe(false);
  });

  it('shows a toast confirming the new state', async () => {
    seedConfig(undefined);
    await mount();

    await act(async () => {
      await latest.toggleReasoningEnabled();
    });

    expect(toasts.map((t) => t.title)).toContain('Reasoning disabled');
  });

  it('reflects the new value in the hook state so the action title flips', async () => {
    seedConfig(undefined);
    await mount();
    expect(latest.reasoningEnabled).toBe(true);

    await act(async () => {
      await latest.toggleReasoningEnabled();
    });

    // This is what ChatActions reads to render
    // "Enable Reasoning for This Llm" vs "Disable Reasoning for This Llm"
    expect(latest.reasoningEnabled).toBe(false);
  });

  it('does not lose other config fields (cachedModels) when toggling', async () => {
    seedConfig(undefined);
    const cfgs = JSON.parse(store.get(CONFIG_KEY)!);
    cfgs[0].cachedModels = { models: [{ id: 'glm-5.3' }], isAvailable: true };
    store.set(CONFIG_KEY, JSON.stringify(cfgs));

    await mount();
    await act(async () => {
      await latest.toggleReasoningEnabled();
    });

    const saved = JSON.parse(store.get(CONFIG_KEY)!)[0];
    expect(saved.cachedModels).toBeDefined();
    expect(saved.cachedModels.models).toHaveLength(1);
  });
});
