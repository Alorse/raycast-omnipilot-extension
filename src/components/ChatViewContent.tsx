import { Detail } from '@raycast/api';
import { useChatLogic } from '../hooks/useChatLogic';
import { ChatActions, ChatEmptyActions } from './ChatActions';

export function ChatViewContent() {
  const {
    isInitialized,
    chatMarkdown,
    handleSendMessage,
    handleConversationChange,
    handleDeleteConversation,
    handleCreateConversation,
    conversations,
    currentConversation,
    isLoading,
  } = useChatLogic();

  if (!isInitialized) {
    return (
      <Detail
        isLoading={true}
        markdown="# 🚀 Initializing chat...\n\nPlease wait while we set up your chat environment."
        navigationTitle="Initializing..."
      />
    );
  }

  if (conversations.length === 0) {
    return (
      <Detail
        markdown="# 💬 Welcome to OmniPilot Chat\n\nNo conversations found. Create your first chat to get started!"
        navigationTitle="No Conversations"
        actions={
          <ChatEmptyActions
            handleCreateConversation={handleCreateConversation}
          />
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={chatMarkdown}
      navigationTitle={
        currentConversation
          ? currentConversation.title
          : 'No conversation selected'
      }
      actions={
        <ChatActions
          currentConversation={currentConversation}
          conversations={conversations}
          handleSendMessage={handleSendMessage}
          handleCreateConversation={handleCreateConversation}
          handleDeleteConversation={handleDeleteConversation}
          handleConversationChange={handleConversationChange}
          showSendMessage={true}
          showConversationSwitch={true}
        />
      }
    />
  );
}
