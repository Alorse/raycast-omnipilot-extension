import { useState, useEffect } from "react";
import { getSelectedText, Detail } from "@raycast/api";
import { CommandTemplate } from "./lib/commandTemplate";

interface Arguments {
  TranslateLanguage: string;
}

export default function TranslateText(props: { arguments: Arguments }) {
  const [selectedText, setSelectedText] = useState<string>("");
  const [isLoadingText, setIsLoadingText] = useState(true);

  const { TranslateLanguage } = props.arguments;

  useEffect(() => {
    async function fetchSelectedText() {
      try {
        const text = await getSelectedText();
        setSelectedText(text);
      } catch (error) {
        console.error("Error getting selected text:", error);
        setSelectedText("");
      } finally {
        setIsLoadingText(false);
      }
    }

    fetchSelectedText();
  }, []);

  if (isLoadingText) {
    return <Detail isLoading={true} markdown="Getting selected text..." />;
  }

  if (!selectedText.trim()) {
    return <Detail markdown="❌ **No text selected**. Please select some text to translate and try again." />;
  }

  // Build the translation prompt
  const translationPrompt = TranslateLanguage
    ? `Translate following text to ${TranslateLanguage}. Try to keep all of the words from the given text and maintain the original meaning as closely as possible. ONLY return the translated text and nothing else.`
    : `If the following text is in English then translate it to Spanish, otherwise translate to English. Try to keep all of the words from the given text and maintain the original meaning as closely as possible. ONLY return the translated text and nothing else.`;

  return <CommandTemplate userQuery={selectedText} customPrompt={translationPrompt} />;
}
