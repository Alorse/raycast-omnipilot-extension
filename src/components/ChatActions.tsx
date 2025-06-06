import { ActionPanel, Action, Icon } from '@raycast/api';
import { ChatConversation, ChatMessage } from '../types/chat';

interface ChatActionsProps {
  // Required props
  searchText?: string;
  currentConversation: ChatConversation | null;
  conversations: ChatConversation[];

  // Action handlers
  handleSendMessage: (text: string) => Promise<void>;
  handleCreateConversation: () => Promise<void>;
  handleDeleteConversation: (conversationId: string) => Promise<void>;

  // Optional props for conditional rendering
  showSendMessage?: boolean;
  conversationId?: string;

  showConversationSwitch?: boolean;
  handleConversationChange?: (conversationId: string) => void;
}

export function ChatActions({
  searchText = '',
  currentConversation,
  conversations,
  handleSendMessage,
  handleCreateConversation,
  handleDeleteConversation,
  showSendMessage = true,
  conversationId,
  showConversationSwitch = false,
  handleConversationChange,
}: ChatActionsProps) {
  // Determine which conversation to work with
  const targetConversation = conversationId
    ? conversations.find((conv) => conv.id === conversationId) ||
      currentConversation
    : currentConversation;

  return (
    <ActionPanel>
      {/* Send Message Action - prioritize searchText input */}
      {showSendMessage && searchText && searchText.trim() && (
        <Action
          title="Send Message"
          icon={Icon.Airplane}
          onAction={() => handleSendMessage(searchText)}
        />
      )}

      {/* Conversation switching for Detail view */}
      {showConversationSwitch &&
        conversations.length > 1 &&
        handleConversationChange && (
          <ActionPanel.Section title="Switch Conversation">
            {conversations
              .filter((conv) => conv.id !== currentConversation?.id)
              .slice(0, 5) // Show only first 5 other conversations
              .map((conv) => (
                <Action
                  key={conv.id}
                  title={`Switch to: ${conv.title}`}
                  icon={Icon.ArrowRight}
                  onAction={() => handleConversationChange!(conv.id)}
                />
              ))}
          </ActionPanel.Section>
        )}

      {/* New Chat Action */}
      <Action
        title="New Chat"
        icon={Icon.Plus}
        onAction={handleCreateConversation}
        shortcut={{ modifiers: ['cmd'], key: 'n' }}
      />

      {/* Copy Actions - only show if conversation has messages */}
      {targetConversation && targetConversation.messages.length > 0 && (
        <ActionPanel.Section title="Copy Actions">
          <Action.CopyToClipboard
            title="Copy Last Response"
            content={
              targetConversation.messages.length > 0
                ? targetConversation.messages[
                    targetConversation.messages.length - 1
                  ]?.content || ''
                : ''
            }
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ['cmd'], key: 'c' }}
          />
          <Action.CopyToClipboard
            title="Copy Entire Conversation"
            content={targetConversation.messages
              .map(
                (msg: ChatMessage) =>
                  `${msg.role.toUpperCase()}: ${msg.content}`,
              )
              .join('\n\n')}
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
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
            shortcut={{ modifiers: ['cmd'], key: 'd' }}
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
        shortcut={{ modifiers: ['cmd'], key: 'n' }}
      />
    </ActionPanel>
  );
}
