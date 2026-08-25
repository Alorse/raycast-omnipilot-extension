/**
 * Rendering of reasoning/thinking tokens as Raycast markdown.
 *
 * Raycast renders CommonMark, which has no <details> element, so reasoning
 * cannot be collapsed by the markup itself — it is shown while the model is
 * still thinking, then hidden behind a ⌘R toggle once the answer arrives.
 * Shared by the chat view and the single-shot commands so both look alike.
 */

export const REASONING_HIDDEN_HINT = '*(🧠 reasoning hidden — ⌘R to toggle)*';

/** The reasoning text as a blockquote, labelled by whether it is still live. */
export function buildReasoningQuote(
  reasoning: string,
  isStreaming: boolean,
): string {
  const quoted = reasoning.replace(/\n/g, '\n> ');
  return `> 🧠 **${isStreaming ? 'Thinking…' : 'Reasoning'}**\n>\n> ${quoted}`;
}

interface ReasoningBlockOptions {
  reasoning?: string;
  /** The model is still thinking — keep it visible regardless of the toggle. */
  isStreaming: boolean;
  showReasoning: boolean;
}

/**
 * A standalone reasoning section: the full blockquote while thinking or when
 * expanded, the one-line hint when collapsed, and nothing at all when the
 * model produced no reasoning.
 */
export function buildReasoningBlock({
  reasoning,
  isStreaming,
  showReasoning,
}: ReasoningBlockOptions): string {
  if (!reasoning) {
    return '';
  }

  return isStreaming || showReasoning
    ? buildReasoningQuote(reasoning, isStreaming)
    : REASONING_HIDDEN_HINT;
}
