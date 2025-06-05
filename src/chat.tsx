import { ChatViewList } from "./components/ChatViewList";
import { ChatViewContent } from "./components/ChatViewContent";

const chatView = true;

export default function ChatCommand() {
  return chatView ? <ChatViewList /> : <ChatViewContent />;
}
