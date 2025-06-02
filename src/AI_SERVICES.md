# OmniPilot AI Services

This folder contains the modular logic for interacting with AI APIs, specifically OpenRouter.

## Structure

```
src/
├── types/           # TypeScript interfaces and types
├── services/        # API services
├── utils/          # Streaming utilities
└── hooks/          # Custom React hooks
```

## Basic Usage

### useAIStreaming Hook (Recommended)

```tsx
import { useAIStreaming } from "./hooks/useAIStreaming";

function MyComponent() {
  const { response, isLoading, askAI } = useAIStreaming();

  const handleQuery = () => {
    askAI("What is the capital of France?");
  };

  return (
    <Detail 
      isLoading={isLoading} 
      markdown={response} 
    />
  );
}
```

### Direct Service

```tsx
import { createOpenRouterService } from "./services/openrouter";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();
const service = createOpenRouterService(preferences);

await service.askAI(
  "Your question here",
  "Your system prompt",
  "model-to-use",
  {
    onChunk: (content) => console.log(content),
    onComplete: (fullResponse) => console.log("Complete:", fullResponse),
    onError: (error) => console.error(error)
  }
);
```

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

- **Reusable**: Use the same logic across multiple commands
- **Modular**: Each part has specific responsibilities
- **Type-safe**: Fully typed with TypeScript
- **Streaming**: Real-time responses with incremental updates
- **Error handling**: Centralized error management
- **Easy to use**: Simple hook for common use cases

## Extension

To add new models or AI services:

1. Update interfaces in `types/`
2. Create new services in `services/`
3. Update the `useAIStreaming` hook if necessary
