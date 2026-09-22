import { describe, it, expect } from 'vitest';
import { buildCurlCommand } from '../curl';
import { LLMConfig } from '../../types/llmConfig';

function config(overrides: Partial<LLMConfig> = {}): LLMConfig {
  return {
    id: '1',
    name: 'Test',
    apiUrl: 'https://openrouter.ai/api/v1',
    apiKey: 'sk-test',
    model: 'openai/gpt-4o',
    isDefault: false,
    isActive: true,
    ...overrides,
  };
}

describe('buildCurlCommand', () => {
  it('posts a non-streaming completion to the chat endpoint', () => {
    const curl = buildCurlCommand(config());

    expect(curl).toContain(
      "curl 'https://openrouter.ai/api/v1/chat/completions'",
    );
    expect(curl).toContain("-H 'Authorization: Bearer sk-test'");
    expect(curl).toContain('"model": "openai/gpt-4o"');
    expect(curl).toContain('"stream": false');
  });

  it('drops trailing slashes from the base URL', () => {
    const curl = buildCurlCommand(
      config({ apiUrl: 'https://api.openai.com/v1/' }),
    );

    expect(curl).toContain("'https://api.openai.com/v1/chat/completions'");
  });

  it('escapes single quotes so the shell keeps them', () => {
    const curl = buildCurlCommand(config({ model: "it's-a-model" }));

    expect(curl).toContain(`"model": "it'\\''s-a-model"`);
  });

  it('exchanges the GitHub token before calling Copilot', () => {
    const curl = buildCurlCommand(
      config({ apiUrl: 'https://api.githubcopilot.com', apiKey: 'ghp_x' }),
    );

    expect(curl).toContain('copilot_internal/v2/token');
    expect(curl).toContain("-H 'Authorization: token ghp_x'");
    expect(curl).toContain('Authorization: Bearer $COPILOT_TOKEN');
    expect(curl).toContain('https://api.githubcopilot.com/chat/completions');
  });
});
