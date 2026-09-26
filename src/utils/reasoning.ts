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
  /** Effort conventions the provider rejected. */
  effortFailed?: ReasoningEffortMode[];
  /**
   * No effort convention is accepted, so none is sent and the model uses its
   * own default.
   */
  effortExhausted?: boolean;
  /** Effort levels the provider said it accepts, read from its rejection. */
  supportedEfforts?: string[];
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

/** The effort levels a user can pick for a configuration. */
export type ReasoningEffort = 'low' | 'medium' | 'high';

/**
 * Every effort name providers publish, lowest first. Wider than what the user
 * picks from, because a model's own list (e.g. `minimal`–`xhigh`) is what a
 * choice gets moved onto.
 */
const EFFORT_SCALE = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

/**
 * The vendor conventions for asking for an effort level. Like the disable
 * conventions, exactly one is ever sent.
 */
export type ReasoningEffortMode =
  | 'reasoning'
  | 'effort'
  | 'thinkingBudget'
  | 'qwenBudget';

/**
 * Thinking budgets for providers that take tokens instead of a level. There is
 * no published standard; these sit in the range LiteLLM and Cherry Studio use.
 */
const BUDGET_TOKENS: Record<string, number> = {
  minimal: 1024,
  low: 2048,
  medium: 8192,
  high: 16384,
  xhigh: 24576,
  max: 32768,
};

/** Room left for the answer on top of an Anthropic thinking budget. */
const ANSWER_TOKENS = 16384;

/** The request-body fragment asking for one effort level. */
export function effortPayloadFor(
  mode: ReasoningEffortMode,
  effort: string,
): Record<string, unknown> {
  const budget = BUDGET_TOKENS[effort] ?? BUDGET_TOKENS.medium;
  switch (mode) {
    case 'reasoning':
      // OpenRouter's documented shape
      return { reasoning: { effort } };
    case 'effort':
      // OpenAI-style, also Gemini, xAI, DeepSeek, Mistral and most gateways
      return { reasoning_effort: effort };
    case 'thinkingBudget':
      // Anthropic's OpenAI-compatible endpoint ignores reasoning_effort, and
      // rejects a budget that is not below max_tokens
      return {
        thinking: { type: 'enabled', budget_tokens: budget },
        max_tokens: budget + ANSWER_TOKENS,
      };
    case 'qwenBudget':
      // Alibaba DashScope (Qwen)
      return { enable_thinking: true, thinking_budget: budget };
  }
}

/** Ordered guesses for a provider, used when it does not declare capabilities. */
function providerEffortCandidates(apiUrl: string): ReasoningEffortMode[] {
  switch (getProviderId(apiUrl)) {
    case 'openrouter':
      return ['reasoning', 'effort'];
    case 'anthropic':
      return ['thinkingBudget'];
    case 'alibaba':
      return ['qwenBudget', 'effort'];
    default:
      // reasoning_effort is the one convention nearly everyone understands
      return ['effort'];
  }
}

/**
 * The effort conventions a /models capability list allows, or null when the
 * endpoint publishes none.
 */
export function effortModesFromSupportedParameters(
  supportedParameters?: string[],
): ReasoningEffortMode[] | null {
  if (!supportedParameters || supportedParameters.length === 0) {
    return null;
  }

  const declared = new Set(supportedParameters.map((p) => p.toLowerCase()));
  const modes: ReasoningEffortMode[] = [];

  if (declared.has('reasoning')) modes.push('reasoning');
  if (declared.has('reasoning_effort')) modes.push('effort');
  if (declared.has('thinking')) modes.push('thinkingBudget');
  if (declared.has('thinking_budget')) modes.push('qwenBudget');

  return modes;
}

/** The effort convention to use next, or null when none is left worth trying. */
export function nextEffortMode(
  apiUrl: string,
  knowledge?: ReasoningKnowledge,
  supportedParameters?: string[],
): ReasoningEffortMode | null {
  if (knowledge?.effortExhausted) {
    return null;
  }

  const declared = effortModesFromSupportedParameters(supportedParameters);
  const candidates = declared ?? providerEffortCandidates(apiUrl);
  const failed = new Set(knowledge?.effortFailed ?? []);

  return candidates.find((mode) => !failed.has(mode)) ?? null;
}

/** Records an effort convention the provider rejected. */
export function recordEffortFailure(
  apiUrl: string,
  knowledge: ReasoningKnowledge | undefined,
  mode: ReasoningEffortMode,
  supportedParameters?: string[],
): ReasoningKnowledge {
  const effortFailed = Array.from(
    new Set([...(knowledge?.effortFailed ?? []), mode]),
  );
  const next: ReasoningKnowledge = { ...knowledge, effortFailed };

  next.effortExhausted =
    nextEffortMode(apiUrl, { effortFailed }, supportedParameters) === null;

  return next;
}

/**
 * Moves a chosen level onto what the model accepts: kept when supported,
 * otherwise the nearest one (ties go up, as Cherry Studio does). Null when the
 * model accepts no level at all. An unknown list leaves the choice untouched.
 */
export function clampEffort(
  effort: string,
  supported?: string[],
): string | null {
  if (!supported) {
    return effort;
  }

  const rank = (e: string) => EFFORT_SCALE.indexOf(e);
  const usable = supported.filter((e) => rank(e) >= 0);
  if (usable.includes(effort)) {
    return effort;
  }

  const target = rank(effort);
  const nearest = [...usable].sort(
    (a, b) =>
      Math.abs(rank(a) - target) - Math.abs(rank(b) - target) ||
      rank(b) - rank(a),
  );
  return nearest[0] ?? null;
}

/** The lowest level a model accepts — what "off" becomes when it cannot be. */
export function lowestEffort(supported?: string[]): string | null {
  const usable = (supported ?? []).filter((e) => EFFORT_SCALE.includes(e));
  usable.sort((a, b) => EFFORT_SCALE.indexOf(a) - EFFORT_SCALE.indexOf(b));
  return usable[0] ?? null;
}

/**
 * Reads the accepted levels out of a rejection that lists them, as OpenAI's
 * does: "Unsupported value: 'reasoning_effort' does not support 'none' with
 * this model. Supported values are: 'minimal', 'low', 'medium', and 'high'."
 */
export function parseSupportedEfforts(message: string): string[] | null {
  const match = /supported values are:?(.*)/i.exec(message);
  if (!match) {
    return null;
  }

  const values = Array.from(match[1].matchAll(/'([a-z]+)'/gi), (m) =>
    m[1].toLowerCase(),
  ).filter((v) => EFFORT_SCALE.includes(v));

  return values.length ? values : null;
}
