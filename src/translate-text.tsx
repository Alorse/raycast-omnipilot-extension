import { useState, useEffect, useRef } from 'react';
import { getSelectedText, Detail } from '@raycast/api';
import { CommandTemplate } from './lib/commandTemplate';
import { LLMValidation } from './components/LLMValidation';

interface Arguments {
  TranslateLanguage: string;
}

export default function TranslateText(props: { arguments: Arguments }) {
  const hasExecutedRef = useRef(false);
  const [selectedText, setSelectedText] = useState<string | null>('');
  const [isLoadingText, setIsLoadingText] = useState(true);

  const { TranslateLanguage } = props.arguments;

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasExecutedRef.current) {
      setSelectedText(null);
      return;
    }

    async function fetchSelectedText() {
      try {
        const text = await getSelectedText();
        setSelectedText(text);
        hasExecutedRef.current = true;
      } catch (error) {
        console.error('Error getting selected text:', error);
        setSelectedText('');
        hasExecutedRef.current = true;
      } finally {
        setIsLoadingText(false);
      }
    }

    fetchSelectedText();
  }, []);

  if (isLoadingText) {
    return <Detail isLoading={true} markdown="Getting selected text..." />;
  }

  if (!selectedText || !selectedText.trim()) {
    return (
      <Detail markdown="❌ **No text selected**. Please select some text to translate and try again." />
    );
  }

  // Build the translation prompt
  const translationPrompt = TranslateLanguage
    ? `Translate following text to ${TranslateLanguage}. Try to keep all of the words from the given text and maintain the original meaning as closely as possible. ONLY return the translated text and nothing else.`
    : `If the following text is in English then translate it to Spanish, otherwise translate to English. Try to keep all of the words from the given text and maintain the original meaning as closely as possible. ONLY return the translated text and nothing else.`;

  // return <></>;
  return (
    <LLMValidation>
      <CommandTemplate
        userQuery={selectedText}
        customPrompt={translationPrompt}
      />
    </LLMValidation>
  );
}
