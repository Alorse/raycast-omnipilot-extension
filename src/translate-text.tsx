import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";
import { CommandTemplate } from "./lib/commandTemplate";

interface Arguments {
  text: string;
}

export default function TranslateText(props: { arguments: Arguments }) {
  const preferences = getPreferenceValues<Preferences>();
  
  // Custom prompt for translation
  const translationPrompt = `You are a professional translator. Please translate the following text accurately, maintaining the original tone and context. If the language is not specified, detect the source language and translate to English. Provide only the translation without additional explanations.`;
  
  return (
    <CommandTemplate
      preferences={preferences}
      userQuery={props.arguments.text}
      customPrompt={translationPrompt}
    />
  );
}
