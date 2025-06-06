import { useState, useEffect, useRef } from 'react';
import { getSelectedText, Detail } from '@raycast/api';
import { CommandTemplate } from './lib/commandTemplate';
import { LLMValidation } from './components/LLMValidation';

export default function ExplainText() {
  const hasExecutedRef = useRef(false);
  const [selectedText, setSelectedText] = useState<string | null>('');
  const [isLoadingText, setIsLoadingText] = useState(true);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasExecutedRef.current) {
      setSelectedText(null);
      return;
    }

    async function fetchSelectedText() {
      try {
        const selected = await getSelectedText();
        setSelectedText(selected);
      } catch {
        setSelectedText(null);
      } finally {
        setIsLoadingText(false);
        hasExecutedRef.current = true;
      }
    }

    fetchSelectedText();
  }, []);

  if (isLoadingText) {
    return <Detail isLoading={true} markdown="Getting text to explain..." />;
  }

  if (!selectedText) {
    return (
      <Detail
        markdown={`❌ **No text to explain**

Please select some text and try again.

**How to use:**
- Select text and run the command
- The selected text will be explained in detail`}
      />
    );
  }

  return (
    <LLMValidation>
      <CommandTemplate
        userQuery={selectedText}
        customPrompt="Explain the following text as best as you can, using the same language as the original text."
      />
    </LLMValidation>
  );
}
