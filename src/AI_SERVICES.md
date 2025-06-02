# OmniPilot AI Services

This folder contains the modular logic for interacting with AI APIs. Supports OpenRouter, OpenAI, Anthropic, Claude, and any other OpenAI-compatible API.

## Structure

```
src/
├── types/           # TypeScript interfaces and types
├── services/        # AI API services (universal compatibility)
├── utils/          # Streaming utilities
└── hooks/          # Custom React hooks
```

## Multi-Provider Support

The service automatically detects and adapts to different AI providers:

- **OpenRouter** (default): `https://openrouter.ai/api/v1`
- **OpenAI**: `https://api.openai.com/v1`
- **Custom APIs**: Any OpenAI-compatible endpoint

### Configuration

Use the extension preferences to configure:

- **API Key**: Your provider's API key
- **Custom API URL**: Override the default OpenRouter URL (e.g., `https://api.openai.com/v1`)
- **Custom Model**: Use when specifying a custom API URL (e.g., `gpt-4o-mini`)
- **Default Model**: Choose from OpenRouter's model list

## Basic Usage

### useAIStreaming Hook (Recommended)

```tsx
import { useAIStreaming } from "./hooks/useAIStreaming";

function MyComponent() {
  const { response, isLoading, askAI } = useAIStreaming();

  const handleQuery = () => {
    askAI("What is the capital of France?");
  };

  return <Detail isLoading={isLoading} markdown={response} />;
}
```

### Direct Service

```tsx
import { createAIService, getModelToUse } from "./services/openrouter";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();
const service = createAIService(preferences);
const model = getModelToUse(preferences);

await service.askAI("Your question here", "Your system prompt", model, {
  onChunk: (content) => console.log(content),
  onComplete: (fullResponse) => console.log("Complete:", fullResponse),
  onError: (error) => console.error(error),
});
```

## Configuration Examples

### Using OpenAI API

In Raycast preferences:

- **API Key**: `sk-...` (your OpenAI API key)
- **Custom API URL**: `https://api.openai.com/v1`
- **Custom Model**: `gpt-4o-mini`

### Using OpenRouter (Default)

In Raycast preferences:

- **API Key**: `sk-or-...` (your OpenRouter API key)
- **Custom API URL**: _(leave empty)_
- **Custom Model**: _(leave empty)_
- **Default Model**: Choose from dropdown

### Custom Streaming

```tsx
import { processStreamingResponse } from "./utils/streaming";

const response = await fetch(/* your configuration */);
const fullText = await processStreamingResponse(response, (chunk) => {
  // Handle each text chunk here
  console.log(chunk);
});
```

## Benefits

- **Multi-Provider Support**: Seamlessly switch between OpenRouter, OpenAI, and any OpenAI-compatible endpoint
- **Reusable Architecture**: Use the same streaming logic across multiple commands (Ask AI, Translate Text, etc.)
- **Modular Design**: Clean separation of concerns with dedicated services, hooks, utilities, and types
- **Type-Safe**: Fully typed with TypeScript interfaces for better development experience and error prevention
- **Real-Time Streaming**: Natural incremental responses that appear as the AI generates text
- **Error Handling**: Centralized error management with user-friendly toast notifications
- **Easy Integration**: Simple `useAIStreaming` hook abstracts complexity for component developers
- **Automatic Provider Detection**: Intelligently detects provider based on API URL and configures headers accordingly
- **Custom Model Support**: Override default models with user-defined preferences
- **Production Ready**: Optimized for single API calls, proper state management, and memory efficiency

## Extension

To add new models or AI services:

1. Update interfaces in `types/`
2. Create new services in `services/`
3. Update the `useAIStreaming` hook if necessary
