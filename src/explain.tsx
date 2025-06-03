import { useState, useEffect } from "react";
import { getPreferenceValues, getSelectedText, Detail } from "@raycast/api";
import { Preferences } from "./types";
import { CommandTemplate } from "./lib/commandTemplate";

export default function ExplainText() {
  const preferences = getPreferenceValues<Preferences>();
  const [selectedText, setSelectedText] = useState<string>("");
  const [isLoadingText, setIsLoadingText] = useState(true);
  const { prompt } = preferences;

  useEffect(() => {
    async function fetchSelectedText() {
      try {
        const selected = await getSelectedText();
        setSelectedText(selected);
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
    return <Detail isLoading={true} markdown="Getting text to explain..." />;
  }

  if (selectedText && selectedText.trim().length === 0) {
    return (
      <Detail 
        markdown="❌ **No text to explain**\n\nPlease select some text or provide text as an argument and try again.\n\n**How to use:**\n- Select text and run the command\n- Or provide text directly as an argument" 
      />
    );
  }

  console.log("Selected Text:", selectedText);

  return null;

  return (
    <CommandTemplate
      preferences={preferences}
      userQuery={selectedText}
      customPrompt={prompt}
    />
  );
}
