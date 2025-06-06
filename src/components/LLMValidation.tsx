import { ReactNode, useEffect, useState, useCallback } from 'react';
import {
  Detail,
  Action,
  ActionPanel,
  Icon,
  showToast,
  Toast,
  Clipboard,
} from '@raycast/api';
import { getLLMStatus, getLLMStatusDescription } from '../utils/llmStatus';

interface LLMValidationProps {
  children: ReactNode;
  onValidationPassed?: () => void;
}

interface LLMValidationState {
  isValid: boolean;
  isLoading: boolean;
  statusMessage: string;
}

/**
 * Higher-order component that validates LLM configurations before allowing AI commands to execute
 * If no valid LLM configurations are found, shows a helpful error screen with actions to fix the issue
 */
export function LLMValidation({
  children,
  onValidationPassed,
}: LLMValidationProps) {
  const [validationState, setValidationState] =
    useState<LLMValidationState>({
      isValid: false,
      isLoading: true,
      statusMessage: 'Checking LLM configurations...',
    });

  const validateLLMConfigs = useCallback(async () => {
    try {
      setValidationState({
        isValid: false,
        isLoading: true,
        statusMessage: 'Checking LLM configurations...',
      });

      const status = await getLLMStatus();
      const statusDescription = await getLLMStatusDescription();

      if (
        status.hasValidConfigs &&
        status.activeConfig &&
        status.activeConfig.apiKey
      ) {
        // Valid configuration found
        setValidationState({
          isValid: true,
          isLoading: false,
          statusMessage: statusDescription,
        });
        onValidationPassed?.();
      } else {
        // No valid configuration
        setValidationState({
          isValid: false,
          isLoading: false,
          statusMessage: statusDescription,
        });
      }
    } catch (error) {
      console.error('Error validating LLM configurations:', error);
      setValidationState({
        isValid: false,
        isLoading: false,
        statusMessage: 'Failed to check LLM configurations. Please try again.',
      });
    }
  }, [onValidationPassed]);

  useEffect(() => {
    validateLLMConfigs();
  }, [validateLLMConfigs]);

  // Show children (the actual AI command) if validation passed
  if (validationState.isValid) {
    return <>{children}</>;
  }

  // Show validation error screen
  return (
    <Detail
      isLoading={validationState.isLoading}
      markdown={getErrorMarkdown(validationState)}
      actions={
        !validationState.isLoading ? (
          <ActionPanel>
            <ActionPanel.Section title="Setup Actions">
              <Action
                title="Refresh and Check Again"
                icon={Icon.ArrowClockwise}
                onAction={validateLLMConfigs}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Help">
              <Action
                title="Copy Setup Instructions"
                icon={Icon.Clipboard}
                onAction={async () => {
                  const setupInstructions = getSetupInstructions();
                  await Clipboard.copy(setupInstructions);
                  showToast({
                    style: Toast.Style.Success,
                    title: 'Instructions copied',
                    message: 'Setup instructions copied to clipboard',
                  });
                }}
                shortcut={{ modifiers: ['cmd'], key: 'c' }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function getSetupInstructions(): string {
  return `OmniPilot LLM Setup Instructions

Quick Setup:

Step 1: Run "Manage LLMs" Command
- Open Raycast and type "Manage LLMs"
- Or use the shortcut to access LLM configuration

Step 2: Add Configuration
1. Add a new LLM configuration
2. Enter your API key and settings  
3. Set it as active

Alternative: Use Extension Preferences
1. Go to Raycast Preferences → Extensions → OmniPilot
2. Configure your API credentials
3. Set your preferred model and provider

Supported Providers:
- OpenRouter - Access multiple AI models through one API
- OpenAI - Direct GPT integration
- Anthropic - Claude models
- Mistral - Mistral models
- Any OpenAI-compatible API

After Setup:
Once configured, press ⌘R to check again, or simply run the AI command again.

Need help? Check the extension preferences or documentation for detailed setup instructions.`;
}

function getErrorMarkdown(state: LLMValidationState): string {
  if (state.isLoading) {
    return '🔍 **Checking LLM Configurations...**\n\nPlease wait while we verify your AI provider settings.';
  }

  return `❌ **LLM Configuration Required**

${state.statusMessage}

## 🚀 Quick Setup

**Step 1: Run "Manage LLMs" Command**
- Open Raycast and type "Manage LLMs"
- Or use the shortcut to access LLM configuration

**Step 2: Add Configuration**
1. Add a new LLM configuration
2. Enter your API key and settings  
3. Set it as active

**Alternative: Use Extension Preferences**
1. Go to Raycast Preferences → Extensions → OmniPilot
2. Configure your API credentials
3. Set your preferred model and provider

## 🔧 Supported Providers

- **OpenRouter** - Access multiple AI models through one API
- **OpenAI** - Direct GPT integration
- **Anthropic** - Claude models
- **Google** - Gemini models
- **Any OpenAI-compatible API**

## 🔄 After Setup

Once configured, press **⌘R** to check again, or simply run the AI command again.

---

*Need help? Check the extension preferences or documentation for detailed setup instructions.*`;
}
