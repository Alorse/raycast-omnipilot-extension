import { Detail, getPreferenceValues } from '@raycast/api';
import { CommandTemplate } from './lib/commandTemplate';
import { LLMValidation } from './components/LLMValidation';
import { NoTextSelected } from './components/NoTextSelected';
import { useSelectedText } from './hooks/useSelectedText';

interface Preferences {
  prompt: string;
}

export default function ExplainText() {
  const { selectedText, isLoadingText } = useSelectedText();
  const preferences = getPreferenceValues<Preferences>();

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
        customPrompt={preferences.prompt}
      />
    </LLMValidation>
  );
}
