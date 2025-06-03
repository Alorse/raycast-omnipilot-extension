import { CommandTemplate } from "./lib/commandTemplate";
import { useInitialization } from "./hooks/useInitialization";

interface Arguments {
  query: string;
}

export default function AskAI(props: { arguments: Arguments }) {
  // Initialize LLM configurations on first load
  useInitialization();

  return <CommandTemplate userQuery={props.arguments.query} />;
}
