import { List, Icon } from "@raycast/api";
import { useChatLogic } from "../hooks/useChatLogic";
import { ChatActions, ChatEmptyActions } from "./ChatActions";

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
    formatMessageTime,
    conversations,
    currentConversation,
    isLoading,
  } = useChatLogic();

  // Helper function to truncate text elegantly
  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  // Helper function to get the last user message and AI response from a conversation
  const getConversationPairs = (conversation: any) => {
    const pairs = [];
    const messages = conversation.messages || [];

    for (let i = 0; i < messages.length; i += 2) {
      const userMessage = messages[i];
      const aiMessage = messages[i + 1];

      if (userMessage && userMessage.role === "user") {
        pairs.push({
          id: `${conversation.id}-${i}`,
          conversationId: conversation.id,
          conversationTitle: conversation.title,
          userQuestion: userMessage.content,
          aiResponse: aiMessage ? aiMessage.content : "Waiting for response...",
          timestamp: conversation.updatedAt || conversation.createdAt,
          isComplete: !!aiMessage,
        });
      }
    }

    return pairs.reverse(); // Show most recent first
  };

  if (!isInitialized) {
    return <List isLoading={true} searchBarPlaceholder="Initializing chat..." />;
  }

  // Get pairs for the currently selected conversation only
  const selectedConversation = currentConversation;
  const conversationPairs = selectedConversation ? getConversationPairs(selectedConversation) : [];

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type your message and press Enter to send..."
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
    >
      {!selectedConversation ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No conversation selected"
          description="Select a conversation from the dropdown above or create a new one"
          actions={<ChatEmptyActions handleCreateConversation={handleCreateConversation} />}
        />
      ) : conversationPairs.length === 0 ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No messages in this conversation"
          description="Send your first message to start chatting"
          actions={
            <ChatActions
              searchText={searchText}
              currentConversation={selectedConversation}
              conversations={conversations}
              handleSendMessage={handleSendMessage}
              handleCreateConversation={handleCreateConversation}
              handleDeleteConversation={handleDeleteConversation}
              handleConversationChange={handleConversationChange}
              showSendMessage={true}
              conversationId={selectedConversation.id}
            />
          }
        />
      ) : (
        // Show each user prompt as a section with AI response as the item
        conversationPairs.map((pair, index) => (
          <List.Section
            key={pair.id}
            title={`👤 ${pair.userQuestion}`}
            subtitle={pair.isComplete ? undefined : "Waiting for AI response..."}
          >
            <List.Item
              title={pair.isComplete ? pair.aiResponse : "🤖 Generating response..."}
              accessories={[
                ...(pair.timestamp
                  ? [
                      {
                        text: formatMessageTime
                          ? formatMessageTime(pair.timestamp)
                          : new Date(pair.timestamp).toLocaleDateString(),
                        tooltip: "Last updated",
                      },
                    ]
                  : []),
              ]}
              actions={
                <ChatActions
                  searchText={searchText}
                  currentConversation={selectedConversation}
                  conversations={conversations}
                  handleSendMessage={handleSendMessage}
                  handleCreateConversation={handleCreateConversation}
                  handleDeleteConversation={handleDeleteConversation}
                  handleConversationChange={handleConversationChange}
                  showSendMessage={true}
                  conversationId={selectedConversation.id}
                />
              }
            />
          </List.Section>
        ))
      )}
    </List>
  );
}
