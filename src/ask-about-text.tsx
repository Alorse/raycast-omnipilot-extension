import { Detail, getPreferenceValues } from '@raycast/api';
import { CommandTemplate } from './lib/commandTemplate';
import { LLMValidation } from './components/LLMValidation';
import { NoTextSelected } from './components/NoTextSelected';
import { useSelectedText } from './hooks/useSelectedText';

interface Preferences {
  prompt: string;
}

interface AskAboutTextProps {
  arguments: {
    query: string;
  };
}

export default function AskAboutText(props: AskAboutTextProps) {
  const { selectedText, isLoadingText } = useSelectedText();
  const preferences = getPreferenceValues<Preferences>();
  const { query } = props.arguments;

  if (isLoadingText) {
    return <Detail isLoading={true} markdown="Getting text to analyze..." />;
  }

  if (!selectedText) {
    return <NoTextSelected commandName="the ask about text command" />;
  }

  if (!query?.trim()) {
    return (
      <Detail
        markdown="## Please provide a question
        
Please provide a question about the selected text in the command arguments."
      />
    );
  }

  const fullQuery = `${query}: ${selectedText}`;

  return (
    <LLMValidation>
      <CommandTemplate
        userQuery={fullQuery}
        customPrompt={preferences.prompt}
      />
    </LLMValidation>
  );
}
