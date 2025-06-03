import { useState, useEffect } from "react";
import { getPreferenceValues, getSelectedText, Detail } from "@raycast/api";
import { Preferences } from "./types";
import { CommandTemplate } from "./lib/commandTemplate";

export default function ExplainText() {
  const preferences = getPreferenceValues<Preferences>();
  const [selectedText, setSelectedText] = useState<string | null>("");
  const [isLoadingText, setIsLoadingText] = useState(true);
  const { prompt } = preferences;

  useEffect(() => {
    async function fetchSelectedText() {
      try {
        const selected = await getSelectedText();
        setSelectedText(selected);
      } catch (error) {
        // getSelectedText() throws an error when no text is selected
        console.log("No text selected:", error);
        setSelectedText(null);
      } finally {
        setIsLoadingText(false);
      }
    }
    
    fetchSelectedText();
  }, []);

  if (isLoadingText) {
    return <Detail isLoading={true} markdown="Getting text to explain..." />;
  }

  if (!selectedText) {
    return (
      <Detail 
        markdown={`❌ **No text to explain**

Please select some text and try again.

**How to use:**
- Select text and run the command
- The selected text will be explained in detail`}
      />
    );
  }

  return (
    <CommandTemplate
      preferences={preferences}
      userQuery={selectedText}
      customPrompt={prompt}
    />
  );
}
