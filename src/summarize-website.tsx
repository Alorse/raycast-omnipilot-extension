import { Detail, ActionPanel, Action, getPreferenceValues } from '@raycast/api';
import { useState } from 'react';
import { useBrowserContent } from './hooks/useBrowser';
import { LLMValidation } from './components/LLMValidation';
import { CommandTemplate } from './lib/commandTemplate';

interface Preferences {
  prompt: string;
}

export default function SummarizeWebsite() {
  const { loading, content, error, retry } = useBrowserContent();
  const preferences = getPreferenceValues<Preferences>();
  const [processContent, setProcessContent] = useState<string | null>(null);

  // Don't render anything until browser content is loaded
  if (loading) {
    return <Detail isLoading={true} markdown="## Loading website content..." />;
  }

  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error) || 'Unknown error';
    const isBrowserExtensionError = errorMessage.includes(
      'Browser extension access is not available',
    );

    return (
      <Detail
        markdown={
          isBrowserExtensionError
            ? `## Browser Extension Required

The Raycast Browser Extension is required but not available. To use this feature:

### Install Raycast Browser Extension:

1. **For Chrome/Brave/Edge:**
   - Go to [Chrome Web Store](https://chromewebstore.google.com/detail/raycast-companion/fgacdjnoljjfikkadhogeofgjoglooma)
   - Click "Add to Chrome"

### After Installation:
- Open a website or YouTube video
- Make sure the extension icon appears in your browser toolbar
- Try running this command again

**Error:** ${errorMessage}`
            : `## Error accessing browser content

Could not access the current browser tab content. 

**Error:** ${errorMessage}

Make sure you have:

1. A browser tab open with content
2. The Raycast browser extension installed and enabled
3. Permission to access browser content

Try opening a website or YouTube video and running the command again.`
        }
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={retry} />
            {isBrowserExtensionError && (
              <Action.OpenInBrowser
                title="Install Chrome Extension"
                url="https://chromewebstore.google.com/detail/raycast-companion/fgacdjnoljjfikkadhogeofgjoglooma"
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  if (!content) {
    return (
      <Detail
        markdown="## No content found

No content was found in the current browser tab. Make sure you have a website or YouTube video open and try again."
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={retry} />
          </ActionPanel>
        }
      />
    );
  }

  // Validate content before processing
  if (typeof content !== 'string' || content.trim().length === 0) {
    return (
      <Detail
        markdown="## Invalid content

The content retrieved from the browser is not valid text. Please try refreshing the page and running the command again."
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={retry} />
          </ActionPanel>
        }
      />
    );
  }

  // Check if content is too large (more than 100KB)
  if (content.length > 100000) {
    return (
      <Detail
        markdown={`## Content Too Large

The content from this page is very large (${Math.round(content.length / 1000)}KB). This might cause issues with the AI processing.

**First 1000 characters:**
\`\`\`
${content.substring(0, 1000)}...
\`\`\`

Would you like to try with a shorter version?`}
        actions={
          <ActionPanel>
            <Action
              title="Process Anyway"
              onAction={() => setProcessContent(content)}
            />
            <Action
              title="Use Truncated Content"
              onAction={() =>
                setProcessContent(
                  content.substring(0, 50000) + '\n\n[Content truncated...]',
                )
              }
            />
            <Action title="Retry" onAction={retry} />
          </ActionPanel>
        }
      />
    );
  }

  // Use processContent if available, otherwise use the original content
  const finalContent = processContent || content;

  // Clean and prepare content for AI processing
  const preparedContent = prepareContentForAI(finalContent);

  // Only render the summary when we have content
  return (
    <LLMValidation>
      <CommandTemplate
        userQuery={preparedContent}
        customPrompt={preferences.prompt}
      />
    </LLMValidation>
  );
}

/**
 * Prepare content for AI processing to avoid streaming issues
 */
function prepareContentForAI(content: string): string {
  // Remove any potential streaming markers or problematic sequences
  const cleaned = content
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();

  // Ensure content doesn't exceed reasonable limits for AI processing
  if (cleaned.length > 50000) {
    return cleaned.substring(0, 50000) + '\n\n[Content truncated for processing...]';
  }

  return cleaned;
}
