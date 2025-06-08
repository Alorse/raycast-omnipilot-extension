import { Detail, getPreferenceValues } from '@raycast/api';
import { CommandTemplate } from './lib/commandTemplate';
import { LLMValidation } from './components/LLMValidation';
import { NoTextSelected } from './components/NoTextSelected';
import { useSelectedText } from './hooks/useSelectedText';

interface Preferences {
  prompt: string;
}

export default function SummarizeText() {
  const { selectedText, isLoadingText } = useSelectedText();
  const preferences = getPreferenceValues<Preferences>();

  if (isLoadingText) {
    return <Detail isLoading={true} markdown="Getting text to summarize..." />;
  }

  if (!selectedText) {
    return <NoTextSelected commandName="the summarize command" />;
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
