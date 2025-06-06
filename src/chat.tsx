import { ChatViewList } from './components/ChatViewList';
import { ChatViewContent } from './components/ChatViewContent';
import { ChatViewWide } from './components/ChatViewWide';

// Change this to test different chat views:
// "list" - Original sidebar view with conversations list
// "wide" - Full-width view with searchbar and dropdown for conversation selection
// "content" - Detail-based view (limited, no searchbar)
const chatViewType: 'list' | 'wide' | 'content' = 'list'; // Change this to "list" or "wide" to test other views

export default function ChatCommand() {
  switch (chatViewType) {
    case 'list':
      return <ChatViewList />;
    case 'wide':
      return <ChatViewWide />;
    case 'content':
      return <ChatViewContent />;
    default:
      return <ChatViewList />;
  }
}
