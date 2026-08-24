/**
 * Request body extensions that disable reasoning on providers with
 * different conventions. Sending both is safe: unknown fields are ignored.
 *
 * - `reasoning: {enabled: false}` — OpenRouter / CLI proxies (validated live
 *   against a CLIProxyAPI instance: disables reasoning_content emission)
 * - `reasoning_effort: 'none'` — OpenAI-style effort control (also honored
 *   by CLIProxyAPI for GLM-style models)
 */
export function buildReasoningDisablePayload(): Record<string, unknown> {
  return {
    reasoning: { enabled: false },
    reasoning_effort: 'none',
  };
}
