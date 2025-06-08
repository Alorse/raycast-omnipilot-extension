import { Detail } from '@raycast/api';

interface NoTextSelectedProps {
  commandName?: string;
  customMessage?: string;
}

export function NoTextSelected({
  commandName = 'this command',
  customMessage,
}: NoTextSelectedProps) {
  const defaultMessage = `❌ **No text selected**

Please select some text and try again.

**How to use:**
- Select text containing the information you want to process
- Run ${commandName}
- The selected text will be processed automatically

**Examples of text you can select:**
- Any text content from websites, documents, or applications
- Code snippets for explanation
- Text that needs translation
- Event information for calendar creation`;

  return <Detail markdown={customMessage || defaultMessage} />;
}
