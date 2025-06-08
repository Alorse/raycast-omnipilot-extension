import { Detail } from '@raycast/api';
import { CommandTemplate } from './lib/commandTemplate';
import { LLMValidation } from './components/LLMValidation';
import { NoTextSelected } from './components/NoTextSelected';
import { useSelectedText } from './hooks/useSelectedText';

interface Arguments {
  TranslateLanguage: string;
}

export default function TranslateText(props: { arguments: Arguments }) {
  const { selectedText, isLoadingText } = useSelectedText();
  const { TranslateLanguage } = props.arguments;

  if (isLoadingText) {
    return <Detail isLoading={true} markdown="Getting selected text..." />;
  }

  if (!selectedText || !selectedText.trim()) {
    return <NoTextSelected commandName="the translate command" />;
  }

  // Build the translation prompt
  const translationPrompt = TranslateLanguage
    ? `Translate following text to ${TranslateLanguage}. Try to keep all of the words from the given text and maintain the original meaning as closely as possible. ONLY return the translated text and nothing else.`
    : `If the following text is in English then translate it to Spanish, otherwise translate to English. Try to keep all of the words from the given text and maintain the original meaning as closely as possible. ONLY return the translated text and nothing else.`;

  return (
    <LLMValidation>
      <CommandTemplate
        userQuery={selectedText}
        customPrompt={translationPrompt}
      />
    </LLMValidation>
  );
}
