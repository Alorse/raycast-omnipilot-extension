import React from 'react';
import { List, Icon } from '@raycast/api';
import { useChatLogic } from '../hooks/useChatLogic';
import { ChatActions, ChatEmptyActions } from './ChatActions';

export function ChatViewList() {
  const {
    isInitialized,
    searchText,
    selectedConversationId,
    chatMarkdown,
    setSearchText,
    handleSendMessage,
    handleConversationChange,
    handleDeleteConversation,
    handleCreateConversation,
    conversations,
    currentConversation,
    isLoading,
    // Blocking flags
    isProcessingResponse,
    isSendingMessage,
    recentlyProcessedResponse,
  } = useChatLogic();

  // Keep a stable selected ID during AI processing to prevent Raycast from auto-switching
  const stableSelectedId = React.useMemo(() => {
    const shouldBlock = isLoading || isProcessingResponse || isSendingMessage || recentlyProcessedResponse;
    
    if (shouldBlock && selectedConversationId) {
      // During AI processing, keep the current selection stable
      return selectedConversationId;
    }
    
    return selectedConversationId;
  }, [selectedConversationId, isLoading, isProcessingResponse, isSendingMessage, recentlyProcessedResponse]);

  // Early return AFTER all hooks
  if (!isInitialized) {
    return (
      <List isLoading={true} searchBarPlaceholder="Initializing chat..." />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type your message and press Enter to send..."
      isShowingDetail={true}
      selectedItemId={stableSelectedId}
      onSelectionChange={(id) => {
        const timestamp = new Date().toLocaleTimeString();
        console.warn(
          `👆 [UI SELECTION CHANGE] ${timestamp} - List selection changed to:`,
          id,
        );
        console.warn(
          `👆 [UI SELECTION CHANGE] ${timestamp} - Current selectedConversationId:`,
          selectedConversationId,
        );

        // Check if we should block ALL UI changes (including automatic ones from Raycast)
        const shouldBlock = isLoading || isProcessingResponse || isSendingMessage || recentlyProcessedResponse;
        
        if (shouldBlock) {
          console.warn(
            `🚫 [UI SELECTION CHANGE] ${timestamp} - BLOCKED at UI level - flags:`,
            { isLoading, isProcessingResponse, isSendingMessage, recentlyProcessedResponse }
          );
          // Don't call handleConversationChange at all - completely ignore this selection change
          return; 
        }

        // Only allow changes that are different from current selection
        if (id && id !== selectedConversationId) {
          console.warn(
            `👆 [UI SELECTION CHANGE] ${timestamp} - Will call handleConversationChange for:`,
            id,
          );
          handleConversationChange(id);
        } else {
          console.warn(
            `👆 [UI SELECTION CHANGE] ${timestamp} - No change needed or blocked`,
          );
        }
      }}
    >
      {conversations.length > 0 ? (
        conversations.map((conversation) => (
          <List.Item
            key={conversation.id}
            id={conversation.id}
            title={conversation.title}
            icon={Icon.Message}
            accessories={[
              conversation.messages.length > 0
                ? { text: `${conversation.messages.length} messages` }
                : { text: 'No messages yet' },
            ]}
            detail={
              <List.Item.Detail
                markdown={
                  conversation.id === selectedConversationId ? chatMarkdown : ''
                }
              />
            }
            actions={
              <ChatActions
                searchText={searchText}
                currentConversation={currentConversation}
                conversations={conversations}
                handleSendMessage={handleSendMessage}
                handleCreateConversation={handleCreateConversation}
                handleDeleteConversation={handleDeleteConversation}
                conversationId={conversation.id}
              />
            }
          />
        ))
      ) : (
        <List.EmptyView
          icon={Icon.Message}
          title="No conversation selected"
          description="Create a new chat to get started"
          actions={
            <ChatEmptyActions
              handleCreateConversation={handleCreateConversation}
            />
          }
        />
      )}
    </List>
  );
}
