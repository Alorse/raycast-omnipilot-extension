import { LLMConfig } from '../types/llmConfig';

const SAMPLE_PROMPT = 'Hello!';

/** Wraps a value in single quotes so the shell passes it through untouched. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function isGitHubCopilot(apiUrl: string): boolean {
  return (
    apiUrl.includes('githubcopilot.com') || apiUrl.includes('api.github.com')
  );
}

/**
 * Builds a ready-to-run cURL command that sends a minimal, non-streaming chat
 * completion to the configuration's endpoint — handy to check a provider
 * outside Raycast.
 *
 * GitHub Copilot is special: the stored key is a GitHub token that has to be
 * exchanged for a short-lived Copilot token first, so the command does that
 * exchange before calling the chat endpoint.
 */
export function buildCurlCommand(config: LLMConfig): string {
  const body = JSON.stringify(
    {
      model: config.model,
      messages: [{ role: 'user', content: SAMPLE_PROMPT }],
      stream: false,
    },
    null,
    2,
  );

  if (isGitHubCopilot(config.apiUrl)) {
    return [
      `COPILOT_TOKEN=$(curl -s https://api.github.com/copilot_internal/v2/token \\`,
      `  -H ${shellQuote(`Authorization: token ${config.apiKey}`)} \\`,
      `  -H 'Accept: application/json' \\`,
      `  | sed -E 's/.*"token": ?"([^"]+)".*/\\1/') && \\`,
      `curl https://api.githubcopilot.com/chat/completions \\`,
      `  -H "Authorization: Bearer $COPILOT_TOKEN" \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -H 'Copilot-Integration-Id: vscode-chat' \\`,
      `  -d ${shellQuote(body)}`,
    ].join('\n');
  }

  const baseUrl = config.apiUrl.replace(/\/+$/, '');

  return [
    `curl ${shellQuote(`${baseUrl}/chat/completions`)} \\`,
    `  -H ${shellQuote(`Authorization: Bearer ${config.apiKey}`)} \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d ${shellQuote(body)}`,
  ].join('\n');
}
