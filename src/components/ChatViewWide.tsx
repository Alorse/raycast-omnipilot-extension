import {
  List,
  Icon,
} from "@raycast/api";
import { useChatLogic } from "../hooks/useChatLogic";
import { ChatActions, ChatEmptyActions } from "./ChatActions";

export function ChatViewWide() {
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
  } = useChatLogic();

  if (!isInitialized) {
    return <List isLoading={true} searchBarPlaceholder="Initializing chat..." />;
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type your message and press Enter to send..."
      isShowingDetail={true}
      selectedItemId={selectedConversationId}
      onSelectionChange={(id) => {
        if (id && id !== selectedConversationId) {
          handleConversationChange(id);
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
                : { text: "No messages yet" },
            ]}
            detail={
              <List.Item.Detail
                markdown={conversation.id === selectedConversationId ? chatMarkdown : ""}
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
                showSendMessage={conversation.id === currentConversation?.id}
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
