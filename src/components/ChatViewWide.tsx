import { List, Icon } from "@raycast/api";
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
      searchBarPlaceholder="Type your message here..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Conversation"
          value={selectedConversationId || ""}
          onChange={(value) => value && handleConversationChange(value)}
        >
          <List.Dropdown.Section title="Conversations">
            {conversations.map((conversation) => (
              <List.Dropdown.Item
                key={conversation.id}
                title={conversation.title}
                value={conversation.id}
                icon={Icon.Message}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      isShowingDetail={true}
    >
      {conversations.length === 0 ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No conversations found"
          description="Create your first chat to get started!"
          actions={<ChatEmptyActions handleCreateConversation={handleCreateConversation} />}
        />
      ) : (
        <>
          {/* Single wide item that represents the full chat view */}
          <List.Item
            key={currentConversation?.id || "chat-view"}
            id={currentConversation?.id || "chat-view"}
            title={""}
            icon={Icon.Message}
            detail={
              <List.Item.Detail
                markdown={
                  currentConversation
                    ? chatMarkdown
                    : "# 💬 Welcome to OmniPilot Chat\n\nSelect a conversation from the dropdown above to start chatting."
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
                handleConversationChange={handleConversationChange}
                showSendMessage={true}
                showConversationSwitch={false} // Dropdown handles conversation switching
              />
            }
          />
        </>
      )}
    </List>
  );
}
