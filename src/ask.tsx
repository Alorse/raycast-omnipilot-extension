import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";
import { CommandTemplate } from "./lib/commandTemplate";

interface Arguments {
  query: string;
}

export default function AskAI(props: { arguments: Arguments }) {
  const preferences = getPreferenceValues<Preferences>();
  
  return (
    <CommandTemplate
      preferences={preferences}
      userQuery={props.arguments.query}
    />
  );
}
