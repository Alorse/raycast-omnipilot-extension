import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  useNavigation,
  showToast,
  Toast,
  Icon,
  confirmAlert,
  Alert,
  getPreferenceValues,
  Color,
} from "@raycast/api";
import { useChat } from "../hooks/useChat";
import { useAIStreaming } from "../hooks/useAIStreaming";
import { ChatConversation, ChatMessage } from "../types/chat";
import { OpenRouterMessage } from "../types";
import { LLMConfigManager } from "../services/llmConfigManager";
import { getProviderName } from "../utils/providers";

interface Preferences {
  systemPrompt: string;
}

export function ChatView() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const {
    conversations,
    currentConversation,
    createConversation,
    addMessage,
    setCurrentConversation,
    getConversationContext,
    deleteConversation,
  } = useChat();

  const { response, isLoading, tokenUsage, chatWithHistory, clearResponse } = useAIStreaming();
  const [isInitialized, setIsInitialized] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [currentConfig, setCurrentConfig] = useState<{
    model: string;
    provider: string;
    configName?: string;
  } | null>(null);

  const responseStartRef = useRef<string>("");
  const processingResponseRef = useRef(false);

  // Initialize chat and load config
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Load current LLM configuration
        const activeConfig = await LLMConfigManager.getActiveLLM();
        if (activeConfig) {
          setCurrentConfig({
            model: activeConfig.model,
            provider: getProviderName(activeConfig.apiUrl),
            configName: activeConfig.name,
          });
        }

        // Create initial conversation if none exists
        if (conversations.length === 0) {
          await createConversation();
        } else if (!currentConversation) {
          setCurrentConversation(conversations[0]);
          setSelectedConversationId(conversations[0].id);
        } else {
          setSelectedConversationId(currentConversation.id);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to initialize chat",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    initializeChat();
  }, [conversations, currentConversation, setCurrentConversation, createConversation]);

  // Handle new AI response
  useEffect(() => {
    if (response && !isLoading && !processingResponseRef.current && currentConversation) {
      // Only process if response has changed from what we started with
      if (response !== responseStartRef.current && response.trim()) {
        processingResponseRef.current = true;

        addMessage(response, "assistant", tokenUsage || undefined)
          .then(() => {
            clearResponse();
            responseStartRef.current = "";
            processingResponseRef.current = false;
          })
          .catch((error) => {
            console.error("Failed to add AI response:", error);
            processingResponseRef.current = false;
          });
      }
    }
  }, [response, isLoading, tokenUsage, currentConversation, addMessage, clearResponse]);

  const handleSendMessage = useCallback(
    async (messageText: string) => {
      const userMessage = messageText.trim();
      if (!userMessage || !currentConversation || isLoading) return;

      try {
        // Clear the search text immediately
        setSearchText("");

        // Add user message
        await addMessage(userMessage, "user");

        // Get conversation context for AI and build complete message history
        const conversationHistory = getConversationContext(currentConversation);

        // Build the complete message array including system prompt and conversation history
        const messages: OpenRouterMessage[] = [
          {
            role: "system",
            content:
              preferences.systemPrompt ||
              "You are a helpful AI assistant. Maintain context from the conversation history and provide thoughtful, relevant responses.",
          },
          ...conversationHistory,
          {
            role: "user",
            content: userMessage,
          },
        ];

        // Start AI response
        responseStartRef.current = response;
        processingResponseRef.current = false;

        await chatWithHistory(messages);
      } catch (error) {
        console.error("Failed to send message:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to send message",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [
      currentConversation,
      isLoading,
      addMessage,
      getConversationContext,
      chatWithHistory,
      response,
      preferences.systemPrompt,
    ],
  );

  const handleConversationChange = useCallback(
    (conversationId: string) => {
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
        setSelectedConversationId(conversationId);
      }
    },
    [conversations, setCurrentConversation],
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      const confirmed = await confirmAlert({
        title: "Delete Conversation",
        message: "Are you sure you want to delete this conversation? This action cannot be undone.",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        await deleteConversation(conversationId);

        // Switch to another conversation if the current one was deleted
        if (currentConversation?.id === conversationId) {
          const remainingConversations = conversations.filter((c) => c.id !== conversationId);
          if (remainingConversations.length > 0) {
            setCurrentConversation(remainingConversations[0]);
            setSelectedConversationId(remainingConversations[0].id);
          } else {
            // Create a new conversation if none remain
            await createConversation();
          }
        }
      }
    },
    [currentConversation, conversations, deleteConversation, setCurrentConversation, createConversation],
  );

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isInitialized) {
    return <List isLoading={true} searchBarPlaceholder="Initializing chat..." />;
  }

  const currentMessages = currentConversation?.messages || [];
  const allMessages = [...currentMessages];

  // Add current streaming response as a temporary message
  if (isLoading && response) {
    allMessages.push({
      id: "streaming",
      role: "assistant" as const,
      content: response,
      timestamp: new Date().toISOString(),
    });
  }

  // Build chat content as markdown for better readability
  const buildChatMarkdown = () => {
    if (!currentConversation || allMessages.length === 0) {
      return `# 💬 Chat with ${currentConfig?.model || "AI"}

*No messages yet. Type your message above and press Enter to start the conversation.*`;
    }

    const chatContent = allMessages
      .map((message) => {
        const role = message.role === "user" ? "👤 **You**" : "🤖 **Assistant**";
        const time = formatMessageTime(message.timestamp);
        const tokens = message.tokenUsage ? ` *(${message.tokenUsage.total_tokens} tokens)*` : "";

        return `${role} ${tokens} - ${time}

${message.content}

---`;
      })
      .join("\n\n");

    return chatContent;
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type your message and press Enter to send..."
      isShowingDetail={true}
      onSelectionChange={(id) => {
        // Handle Enter key press to send message
        if (searchText.trim()) {
          handleSendMessage(searchText);
        }
      }}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Conversation" value={selectedConversationId} onChange={handleConversationChange}>
          {conversations.map((conversation) => (
            <List.Dropdown.Item
              key={conversation.id}
              title={conversation.title}
              value={conversation.id}
              icon={Icon.Message}
            />
          ))}
        </List.Dropdown>
      }
    >
      {currentConversation ? (
        <List.Item
          title={currentConversation.title}
          subtitle={
            currentConversation.messages.length > 0
              ? `${currentConversation.messages.length} messages`
              : "Start typing to begin conversation"
          }
          icon={Icon.Message}
          detail={<List.Item.Detail markdown={buildChatMarkdown()} />}
          actions={
            <ActionPanel>
              {searchText.trim() && (
                <Action title="Send Message" icon={Icon.Airplane} onAction={() => handleSendMessage(searchText)} />
              )}
              <ActionPanel.Section>
                <Action
                  title="New Chat"
                  icon={Icon.Plus}
                  onAction={async () => {
                    await createConversation();
                    showToast({
                      style: Toast.Style.Success,
                      title: "New chat created",
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel.Section>
              {currentConversation.messages.length > 0 && (
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Last Response"
                    content={
                      currentConversation.messages.length > 0
                        ? currentConversation.messages[currentConversation.messages.length - 1]?.content || ""
                        : ""
                    }
                    icon={Icon.Clipboard}
                  />
                  <Action.CopyToClipboard
                    title="Copy Entire Conversation"
                    content={currentConversation.messages
                      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
                      .join("\n\n")}
                    icon={Icon.CopyClipboard}
                  />
                </ActionPanel.Section>
              )}
              {conversations.length > 1 && (
                <ActionPanel.Section>
                  <Action
                    title="Delete This Chat"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteConversation(currentConversation.id)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel.Section>
              )}
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Message}
          title="No conversation selected"
          description="Create a new chat to get started"
          actions={
            <ActionPanel>
              <Action
                title="New Chat"
                icon={Icon.Plus}
                onAction={async () => {
                  await createConversation();
                  showToast({
                    style: Toast.Style.Success,
                    title: "New chat created",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
