import { useState, useEffect, useRef } from 'react';
import { Detail } from '@raycast/api';
import { getSelectedText } from './utils/getSelectedText';
import { CommandTemplate } from './lib/commandTemplate';
import { LLMValidation } from './components/LLMValidation';

interface Arguments {
  TranslateLanguage: string;
}

export default function TranslateText(props: { arguments: Arguments }) {
  const hasExecutedRef = useRef(false);
  const selectedTextRef = useRef<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(true);

  const { TranslateLanguage } = props.arguments;

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasExecutedRef.current) {
      selectedTextRef.current = null;
      return;
    }

    async function fetchSelectedText() {
      try {
        const text = await getSelectedText();
        selectedTextRef.current = text;
        hasExecutedRef.current = true;
      } catch (error) {
        console.error('Error getting selected text:', error);
        selectedTextRef.current = '';
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

  if (!selectedTextRef.current || !selectedTextRef.current.trim()) {
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
        userQuery={selectedTextRef.current}
        customPrompt={translationPrompt}
      />
    </LLMValidation>
  );
}
