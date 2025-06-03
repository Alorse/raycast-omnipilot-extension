import { CommandTemplate } from "./lib/commandTemplate";
import { useInitialization } from "./hooks/useInitialization";
import { LLMValidation } from "./components/LLMValidation";

interface Arguments {
  query: string;
}

export default function AskAI(props: { arguments: Arguments }) {
  // Initialize LLM configurations on first load
  useInitialization();

  return (
    <LLMValidation>
      <CommandTemplate userQuery={props.arguments.query} />
    </LLMValidation>
  );
}
