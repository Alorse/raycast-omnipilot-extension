import React from "react";
import {
  List,
  Icon,
} from "@raycast/api";
import { useChatLogic } from "../hooks/useChatLogic";
import { ChatActions, ChatEmptyActions } from "./ChatActions";

export function ChatViewContent() {
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
    return (
      <List
        isLoading={true}
        searchBarPlaceholder="Initializing chat..."
        searchBarAccessory={
          <List.Dropdown tooltip="Select Conversation">
            <List.Dropdown.Item title="Loading..." value="" />
          </List.Dropdown>
        }
      />
    );
  }

  if (conversations.length === 0) {
    return (
      <List
        searchBarPlaceholder="Type your message and press Enter to send..."
        searchBarAccessory={
          <List.Dropdown tooltip="Select Conversation">
            <List.Dropdown.Item title="No conversations" value="" />
          </List.Dropdown>
        }
        actions={
          <ChatEmptyActions
            handleCreateConversation={handleCreateConversation}
          />
        }
      >
        <List.EmptyView
          icon={Icon.Message}
          title="No conversations found"
          description="Create your first chat to get started!"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type your message and press Enter to send..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Conversation"
          value={selectedConversationId}
          onChange={handleConversationChange}
        >
          {conversations.map((conv) => (
            <List.Dropdown.Item
              key={conv.id}
              title={conv.title}
              value={conv.id}
            />
          ))}
        </List.Dropdown>
      }
      isShowingDetail={true}
    >
      <List.Item
        title={currentConversation ? currentConversation.title : "No conversation selected"}
        subtitle={
          currentConversation && currentConversation.messages.length > 0
            ? `${currentConversation.messages.length} messages`
            : "No messages yet"
        }
        icon={Icon.Message}
        detail={
          <List.Item.Detail
            markdown={chatMarkdown}
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
            showSendMessage={true}
          />
        }
      />
    </List>
  );
}
