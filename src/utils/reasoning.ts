import { getProviderId } from './providers';

/**
 * The vendor conventions for turning a reasoning model's thinking off.
 *
 * They are mutually exclusive: gateways reject requests carrying more than one
 *   "Only one of 'reasoning' and 'reasoning_effort' may be provided"
 *   "Conflicting thinking controls: reasoning_effort is 'low', but
 *    enable_thinking is False"
 * so exactly one is ever sent.
 */
export type ReasoningDisableMode =
  | 'reasoning'
  | 'effort'
  | 'thinking'
  | 'enableThinking';

/** The request-body fragment for one convention. */
export function disablePayloadFor(
  mode: ReasoningDisableMode,
): Record<string, unknown> {
  switch (mode) {
    case 'reasoning':
      // OpenRouter's documented shape
      return { reasoning: { enabled: false } };
    case 'effort':
      // OpenAI-style effort control
      return { reasoning_effort: 'none' };
    case 'thinking':
      // Z.AI / BigModel (GLM)
      return { thinking: { type: 'disabled' } };
    case 'enableThinking':
      // vLLM / Qwen / GLM open-weights and the gateways wrapping them
      return { enable_thinking: false };
  }
}

/**
 * What we have learned about one model, from the provider's own declarations
 * and from how it actually behaved. Kept per model because a single gateway
 * commonly fronts models that disagree.
 */
export interface ReasoningKnowledge {
  /**
   * Conventions the provider rejected, or accepted and then ignored.
   *
   * Only failure is ever recorded. A response with no reasoning in it is NOT
   * proof that the convention worked — reasoning models routinely answer a
   * trivial prompt without thinking at all — so treating that as success
   * pins whichever convention happened to be in flight and makes the choice
   * oscillate. Failure is unambiguous: we asked the model not to think and
   * it thought anyway.
   */
  failed?: ReasoningDisableMode[];
  /** Every candidate has failed; there is nothing left to send. */
  exhausted?: boolean;
}

/** Knowledge for every model of one configuration, keyed by model id. */
export type ReasoningKnowledgeByModel = Record<string, ReasoningKnowledge>;

/**
 * Ordered guesses for a provider, best first. Only consulted when the provider
 * does not declare its capabilities.
 */
function providerCandidates(apiUrl: string): ReasoningDisableMode[] {
  switch (getProviderId(apiUrl)) {
    case 'openrouter':
      return ['reasoning', 'effort'];
    case 'openai':
      return ['effort'];
    case 'deepseek':
      return ['effort'];
    case 'alibaba':
      return ['enableThinking', 'effort'];
    case 'anthropic':
      return ['thinking'];
    default:
      // Self-hosted gateways and CLI proxies: these two are what they
      // understand in practice, the rest are long shots.
      return ['effort', 'enableThinking', 'reasoning', 'thinking'];
  }
}

/**
 * Reads the capability list an OpenAI-compatible /models endpoint may publish
 * (OpenRouter does) and turns it into the conventions worth trying.
 * Returns null when the endpoint says nothing useful.
 */
export function modesFromSupportedParameters(
  supportedParameters?: string[],
): ReasoningDisableMode[] | null {
  if (!supportedParameters || supportedParameters.length === 0) {
    return null;
  }

  const declared = new Set(supportedParameters.map((p) => p.toLowerCase()));
  const modes: ReasoningDisableMode[] = [];

  if (declared.has('reasoning')) modes.push('reasoning');
  if (declared.has('reasoning_effort')) modes.push('effort');
  if (declared.has('thinking')) modes.push('thinking');
  if (declared.has('enable_thinking')) modes.push('enableThinking');

  // The endpoint published a parameter list and no reasoning control is in it,
  // so there is nothing to send — treated as "nothing to try".
  return modes.length ? modes : [];
}

/**
 * The convention to use for the next request, or null when there is nothing
 * left worth trying: the first candidate not yet known to fail. Declared
 * capabilities win over provider guesses. Stable by construction — as long as
 * a convention keeps working, no failure is recorded and it keeps being
 * chosen.
 */
export function nextDisableMode(
  apiUrl: string,
  knowledge?: ReasoningKnowledge,
  supportedParameters?: string[],
): ReasoningDisableMode | null {
  if (knowledge?.exhausted) {
    return null;
  }

  const declared = modesFromSupportedParameters(supportedParameters);
  const candidates = declared ?? providerCandidates(apiUrl);
  const failed = new Set(knowledge?.failed ?? []);

  return candidates.find((mode) => !failed.has(mode)) ?? null;
}

/** Records a convention that did not work, and whether anything is left. */
export function recordFailure(
  apiUrl: string,
  knowledge: ReasoningKnowledge | undefined,
  mode: ReasoningDisableMode,
  supportedParameters?: string[],
): ReasoningKnowledge {
  const failed = Array.from(new Set([...(knowledge?.failed ?? []), mode]));
  const next: ReasoningKnowledge = { ...knowledge, failed };

  next.exhausted =
    nextDisableMode(apiUrl, { failed }, supportedParameters) === null;

  return next;
}

/**
 * Whether a failed response is the provider objecting to the reasoning control
 * we sent rather than a real problem with the request — the difference between
 * "try another convention" and "show the user the error".
 */
export function isReasoningParamError(message: string): boolean {
  const m = message.toLowerCase();
  const mentionsReasoning =
    m.includes('reasoning') ||
    m.includes('thinking') ||
    m.includes('enable_thinking');
  if (!mentionsReasoning) {
    return false;
  }
  return (
    m.includes('conflict') ||
    m.includes('only one of') ||
    m.includes('invalid') ||
    m.includes('unsupported') ||
    m.includes('not supported') ||
    m.includes('unknown') ||
    m.includes('unexpected') ||
    m.includes('cannot be') ||
    m.includes('must be')
  );
}
