import { Detail } from '@raycast/api';
import { CommandTemplate } from './lib/commandTemplate';
import { LLMValidation } from './components/LLMValidation';
import { NoTextSelected } from './components/NoTextSelected';
import { useSelectedText } from './hooks/useSelectedText';

export default function ExplainText() {
  const { selectedText, isLoadingText } = useSelectedText();

  if (isLoadingText) {
    return <Detail isLoading={true} markdown="Getting text to explain..." />;
  }

  if (!selectedText) {
    return <NoTextSelected commandName="the explain command" />;
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
