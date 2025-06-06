/**
 * Format error messages with helpful context and suggestions
 */
export function formatErrorMessage(errorMessage: string): string {
  const baseMessage = '❌ **Error processing your request**\n\n';

  // Check for specific error types and provide helpful guidance
  if (
    errorMessage.includes('model not found') ||
    errorMessage.includes('model_not_found')
  ) {
    return (
      `${baseMessage}🔍 **Model not found**\n\n` +
      `The specified model does not exist or is not available.\n\n` +
      `**Possible solutions:**\n` +
      `• Check the model name in preferences\n` +
      `• Consult available models from your provider\n` +
      `• Use a common model like "gpt-3.5-turbo"\n\n` +
      `**Technical error:** ${errorMessage}`
    );
  }

  if (
    errorMessage.includes('Invalid API key') ||
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('401')
  ) {
    return (
      `${baseMessage}🔑 **Invalid API Key**\n\n` +
      `Your API key is invalid or has expired.\n\n` +
      `**Solutions:**\n` +
      `• Verify your API key in extension preferences\n` +
      `• Make sure the key hasn't expired\n` +
      `• Generate a new API key if necessary\n\n` +
      `**Technical error:** ${errorMessage}`
    );
  }

  if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
    return (
      `${baseMessage}⏱️ **Rate limit exceeded**\n\n` +
      `You've made too many requests too quickly.\n\n` +
      `**Solutions:**\n` +
      `• Wait a few minutes before trying again\n` +
      `• Reduce the frequency of your queries\n` +
      `• Consider upgrading your plan if needed\n\n` +
      `**Technical error:** ${errorMessage}`
    );
  }

  if (
    errorMessage.includes('insufficient') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('credits')
  ) {
    return (
      `${baseMessage}💳 **Insufficient funds**\n\n` +
      `You don't have enough credits or have exceeded your quota.\n\n` +
      `**Solutions:**\n` +
      `• Top up your account in the provider dashboard\n` +
      `• Check your spending limits\n` +
      `• Consider switching to a more economical model\n\n` +
      `**Technical error:** ${errorMessage}`
    );
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return (
      `${baseMessage}⏰ **Request timeout**\n\n` +
      `The request took too long to process.\n\n` +
      `**Solutions:**\n` +
      `• Try again in a few moments\n` +
      `• Reduce the complexity of your query\n` +
      `• Check your internet connection\n\n` +
      `**Technical error:** ${errorMessage}`
    );
  }

  if (
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('fetch')
  ) {
    return (
      `${baseMessage}🌐 **Connection error**\n\n` +
      `Could not establish connection to the AI service.\n\n` +
      `**Solutions:**\n` +
      `• Check your internet connection\n` +
      `• Try again in a few moments\n` +
      `• Verify that the API URL is correct\n\n` +
      `**Technical error:** ${errorMessage}`
    );
  }

  // Generic error format for unknown errors
  return (
    `${baseMessage}🚨 **Unknown error**\n\n` +
    `An unexpected error occurred.\n\n` +
    `**General solutions:**\n` +
    `• Check your configuration in preferences\n` +
    `• Try again in a few moments\n` +
    `• Contact support if the problem persists\n\n` +
    `**Technical error:** ${errorMessage}`
  );
}
