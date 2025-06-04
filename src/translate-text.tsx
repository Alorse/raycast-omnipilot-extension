import { useState, useEffect } from "react";
import { getSelectedText, Detail, showToast, Toast } from "@raycast/api";
import { CommandTemplate } from "./lib/commandTemplate";
import { LLMValidation } from "./components/LLMValidation";

interface Arguments {
  TranslateLanguage: string;
}

export default function TranslateText(props: { arguments: Arguments }) {
  const [selectedText, setSelectedText] = useState<string>("");
  const [isLoadingText, setIsLoadingText] = useState(true);

  const { TranslateLanguage } = props.arguments;

  // Helper function to validate if the text looks like a language name
  // This prevents clipboard content from being mistakenly used as a language
  const isValidLanguage = (text: string): boolean => {
    if (!text || !text.trim()) return false;

    const trimmedText = text.trim();

    // Common language names and codes
    const validLanguages = [
      "english",
      "spanish",
      "french",
      "german",
      "italian",
      "portuguese",
      "russian",
      "chinese",
      "japanese",
      "korean",
      "arabic",
      "hindi",
      "dutch",
      "swedish",
      "norwegian",
      "danish",
      "finnish",
      "polish",
      "czech",
      "turkish",
      "greek",
      "hebrew",
      "thai",
      "vietnamese",
      "indonesian",
      "malay",
      "tagalog",
      "en",
      "es",
      "fr",
      "de",
      "it",
      "pt",
      "ru",
      "zh",
      "ja",
      "ko",
      "ar",
      "hi",
      "nl",
      "sv",
      "no",
      "da",
      "fi",
      "pl",
      "cs",
      "tr",
      "el",
      "he",
      "th",
      "vi",
      "id",
      "ms",
      "tl",
      "ca",
      "eu",
      "gl",
    ];

    // Check if it's a known language
    if (validLanguages.includes(trimmedText.toLowerCase())) {
      return true;
    }

    // Simple heuristics to detect if it's likely a language name
    // Language names are typically:
    // - Short (1-3 words, under 30 characters)
    // - Don't contain numbers, special characters, or multiple sentences
    // - Don't contain common non-language words

    if (trimmedText.length > 30) return false;
    if (/\d/.test(trimmedText)) return false; // Contains numbers
    if (/[.!?;:]/.test(trimmedText)) return false; // Contains sentence punctuation
    if (trimmedText.split(" ").length > 3) return false; // More than 3 words

    // Check for common non-language words that might be in clipboard
    const commonNonLanguageWords = [
      "http",
      "https",
      "www",
      "com",
      "org",
      "net",
      "email",
      "password",
      "username",
      "login",
      "signup",
      "register",
      "click",
      "here",
      "download",
      "install",
      "configure",
      "settings",
      "options",
      "preferences",
      "file",
      "folder",
      "document",
      "text",
      "copy",
      "paste",
      "cut",
      "save",
      "open",
      "close",
      "quit",
      "exit",
      "help",
      "about",
      "contact",
      "support",
    ];

    const lowerText = trimmedText.toLowerCase();
    if (commonNonLanguageWords.some((word) => lowerText.includes(word))) {
      return false;
    }

    return true;
  };

  // Validate the language input to prevent clipboard content from being used as language
  const validatedLanguage = isValidLanguage(TranslateLanguage) ? TranslateLanguage : "";

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
  const translationPrompt = validatedLanguage
    ? `Translate following text to ${validatedLanguage}. Try to keep all of the words from the given text and maintain the original meaning as closely as possible. ONLY return the translated text and nothing else.`
    : `If the following text is in English then translate it to Spanish, otherwise translate to English. Try to keep all of the words from the given text and maintain the original meaning as closely as possible. ONLY return the translated text and nothing else.`;

  return (
    <LLMValidation>
      <CommandTemplate userQuery={selectedText} customPrompt={translationPrompt} />
    </LLMValidation>
  );
}
