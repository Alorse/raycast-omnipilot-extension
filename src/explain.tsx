import { useState, useEffect, useRef } from 'react';
import { Detail } from '@raycast/api';
import { getSelectedText } from './utils/getSelectedText';
import { CommandTemplate } from './lib/commandTemplate';
import { LLMValidation } from './components/LLMValidation';
import { NoTextSelected } from './components/NoTextSelected';

export default function ExplainText() {
  const hasExecutedRef = useRef(false);
  const selectedTextRef = useRef<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(true);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasExecutedRef.current) {
      selectedTextRef.current = null;
      return;
    }

    async function fetchSelectedText() {
      try {
        const selected = await getSelectedText();
        selectedTextRef.current = selected;
      } catch {
        selectedTextRef.current = null;
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

  if (!selectedTextRef.current) {
    return <NoTextSelected commandName="the explain command" />;
  }

  return (
    <LLMValidation>
      <CommandTemplate
        userQuery={selectedTextRef.current}
        customPrompt="Explain the following text as best as you can, using the same language as the original text."
      />
    </LLMValidation>
  );
}
