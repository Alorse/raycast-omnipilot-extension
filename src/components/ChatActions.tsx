import React from "react";
import { ActionPanel, Action, Icon } from "@raycast/api";

interface ChatActionsProps {
  // Required props
  searchText: string;
  currentConversation: any;
  conversations: any[];
  
  // Action handlers
  handleSendMessage: (text: string) => Promise<void>;
  handleCreateConversation: () => Promise<void>;
  handleDeleteConversation: (conversationId: string) => Promise<void>;
  
  // Optional props for conditional rendering
  showSendMessage?: boolean;
  conversationId?: string;
}

export function ChatActions({
  searchText,
  currentConversation,
  conversations,
  handleSendMessage,
  handleCreateConversation,
  handleDeleteConversation,
  showSendMessage = true,
  conversationId,
}: ChatActionsProps) {
  // Determine which conversation to work with
  const targetConversation = conversationId 
    ? conversations.find(conv => conv.id === conversationId) || currentConversation
    : currentConversation;

  return (
    <ActionPanel>
      {/* Send Message Action - only show if there's text and showSendMessage is true */}
      {showSendMessage && searchText.trim() && (
        <Action
          title="Send Message"
          icon={Icon.Airplane}
          onAction={() => handleSendMessage(searchText)}
          shortcut={{ modifiers: ["cmd"], key: "enter" }}
        />
      )}

      {/* New Chat Action */}
      <Action
        title="New Chat"
        icon={Icon.Plus}
        onAction={handleCreateConversation}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />

      {/* Copy Actions - only show if conversation has messages */}
      {targetConversation && targetConversation.messages.length > 0 && (
        <ActionPanel.Section title="Copy Actions">
          <Action.CopyToClipboard
            title="Copy Last Response"
            content={
              targetConversation.messages.length > 0
                ? targetConversation.messages[targetConversation.messages.length - 1]?.content || ""
                : ""
            }
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Entire Conversation"
            content={targetConversation.messages
              .map((msg: any) => `${msg.role.toUpperCase()}: ${msg.content}`)
              .join("\n\n")}
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel.Section>
      )}

      {/* Delete Action - only show if there are multiple conversations and we have a target conversation */}
      {conversations.length > 1 && targetConversation && (
        <ActionPanel.Section title="Danger Zone">
          <Action
            title="Delete This Chat"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => handleDeleteConversation(targetConversation.id)}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}

// Alternative version for EmptyView when no conversations exist
export function ChatEmptyActions({
  handleCreateConversation,
}: {
  handleCreateConversation: () => Promise<void>;
}) {
  return (
    <ActionPanel>
      <Action
        title="New Chat"
        icon={Icon.Plus}
        onAction={handleCreateConversation}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />
    </ActionPanel>
  );
}
