import { useState, useEffect } from "react";
import { getPreferenceValues, getSelectedText, Detail } from "@raycast/api";
import { Preferences } from "./types";
import { CommandTemplate } from "./lib/commandTemplate";

interface Arguments {
  TranslateLanguage: string;
}

export default function TranslateText(props: { arguments: Arguments }) {
  const preferences = getPreferenceValues<Preferences>();
  const [selectedText, setSelectedText] = useState<string>("");
  const [isLoadingText, setIsLoadingText] = useState(true);
  
  const { TranslateLanguage } = props.arguments;
  const { prompt, defaultTargetLanguage, secondTargetLanguage } = preferences;

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

  // Build the translation prompt based on your logic
  const translationPrompt = TranslateLanguage
    ? `Translate following text to ${TranslateLanguage}. ${prompt}`
    : `If the following text is in ${defaultTargetLanguage} then translate it to ${secondTargetLanguage}, otherwise translate ${defaultTargetLanguage}. ${prompt}`;

  console.log("Translation Prompt:", translationPrompt);
  // return null;

  return (
    <CommandTemplate
      preferences={preferences}
      userQuery={selectedText}
      customPrompt={translationPrompt}
    />
  );
}
