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

  const handleSendMessage = useCallback(async (messageText: string) => {
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
          content: preferences.systemPrompt || "You are a helpful AI assistant. Maintain context from the conversation history and provide thoughtful, relevant responses.",
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
  }, [currentConversation, isLoading, addMessage, getConversationContext, chatWithHistory, response, preferences.systemPrompt]);

  const handleConversationChange = useCallback((conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
      setSelectedConversationId(conversationId);
    }
  }, [conversations, setCurrentConversation]);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
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
        const remainingConversations = conversations.filter(c => c.id !== conversationId);
        if (remainingConversations.length > 0) {
          setCurrentConversation(remainingConversations[0]);
          setSelectedConversationId(remainingConversations[0].id);
        } else {
          // Create a new conversation if none remain
          await createConversation();
        }
      }
    }
  }, [currentConversation, conversations, deleteConversation, setCurrentConversation, createConversation]);

  const getMessageIcon = (role: string) => {
    return role === "user" ? Icon.Person : Icon.ComputerChip;
  };

  const getMessageColor = (role: string) => {
    return role === "user" ? Color.Blue : Color.Green;
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    return content.length > maxLength ? content.substring(0, maxLength) + "..." : content;
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
      actions={
        <ActionPanel>
          {searchText.trim() && (
            <Action
              title="Send Message"
              icon={Icon.Airplane}
              onAction={() => handleSendMessage(searchText)}
            />
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
          {currentConversation && (
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
        </ActionPanel>
      }
    >
      {currentConversation ? (
        <>
          {allMessages.length === 0 ? (
            <List.EmptyView
              icon={Icon.Message}
              title="Start a conversation"
              description={`Type your message above and press Enter to chat with ${currentConfig?.model || 'AI'}`}
            />
          ) : (
            allMessages.map((message) => (
              <List.Item
                key={message.id}
                title={message.role === "user" ? "You" : "Assistant"}
                subtitle={truncateContent(message.content)}
                accessories={[
                  { text: formatMessageTime(message.timestamp) },
                  message.tokenUsage ? { 
                    tag: { value: `${message.tokenUsage.total_tokens} tokens`, color: Color.SecondaryText } 
                  } : {},
                ]}
                icon={{
                  source: getMessageIcon(message.role),
                  tintColor: getMessageColor(message.role),
                }}
                detail={
                  <List.Item.Detail
                    markdown={`## ${message.role === "user" ? "👤 You" : "🤖 Assistant"} 
                    
${message.content}

${message.tokenUsage ? `---
**Token Usage:** ${message.tokenUsage.total_tokens} total (${message.tokenUsage.prompt_tokens} prompt + ${message.tokenUsage.completion_tokens} completion)` : ""}
                    `}
                    metadata={
                      message.tokenUsage ? (
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Role"
                            text={message.role === "user" ? "You" : "Assistant"}
                            icon={getMessageIcon(message.role)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Time"
                            text={new Date(message.timestamp).toLocaleString()}
                            icon={Icon.Clock}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Total Tokens"
                            text={message.tokenUsage.total_tokens.toString()}
                            icon={Icon.BarChart}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Prompt Tokens"
                            text={message.tokenUsage.prompt_tokens.toString()}
                            icon={Icon.QuestionMarkCircle}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Completion Tokens"
                            text={message.tokenUsage.completion_tokens.toString()}
                            icon={Icon.CheckCircle}
                          />
                        </List.Item.Detail.Metadata>
                      ) : (
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Role"
                            text={message.role === "user" ? "You" : "Assistant"}
                            icon={getMessageIcon(message.role)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Time"
                            text={new Date(message.timestamp).toLocaleString()}
                            icon={Icon.Clock}
                          />
                        </List.Item.Detail.Metadata>
                      )
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    {searchText.trim() && (
                      <Action
                        title="Send Message"
                        icon={Icon.Airplane}
                        onAction={() => handleSendMessage(searchText)}
                      />
                    )}
                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Message"
                        content={message.content}
                        icon={Icon.Clipboard}
                      />
                    </ActionPanel.Section>
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
                      {conversations.length > 1 && (
                        <Action
                          title="Delete This Chat"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => handleDeleteConversation(currentConversation.id)}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                        />
                      )}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))
          )}
        </>
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