import { useState, useCallback, useEffect } from "react";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { ChatConversation, ChatMessage, ChatState } from "../types/chat";
import { TokenUsage } from "../types";
import { LLMConfigManager } from "../services/llmConfigManager";
import { getProviderName } from "../utils/providers";

const CHAT_STORAGE_KEY = "omni-pilot-chat-conversations";

export function useChat() {
  const [state, setState] = useState<ChatState>({
    currentConversation: null,
    conversations: [],
    isLoading: false,
    error: null,
  });

  // Load conversations from storage
  const loadConversations = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const stored = await LocalStorage.getItem<string>(CHAT_STORAGE_KEY);
      if (stored) {
        const conversations = JSON.parse(stored) as ChatConversation[];
        setState((prev) => ({ ...prev, conversations, isLoading: false }));
      } else {
        setState((prev) => ({ ...prev, conversations: [], isLoading: false }));
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setState((prev) => ({
        ...prev,
        error: "Failed to load conversations",
        isLoading: false,
      }));
    }
  }, []);

  // Save conversations to storage
  const saveConversations = useCallback(async (conversations: ChatConversation[]) => {
    try {
      await LocalStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error("Failed to save conversations:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save conversation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  // Create new conversation
  const createConversation = useCallback(
    async (title?: string): Promise<ChatConversation> => {
      try {
        const activeConfig = await LLMConfigManager.getActiveLLM();

        if (!activeConfig) {
          throw new Error("No active LLM configuration found");
        }

        const newConversation: ChatConversation = {
          id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: title || "New Chat",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
          model: activeConfig.model,
          provider: getProviderName(activeConfig.apiUrl),
          configName: activeConfig.name,
          totalTokens: 0,
        };

        const updatedConversations = [newConversation, ...state.conversations];

        setState((prev) => ({
          ...prev,
          currentConversation: newConversation,
          conversations: updatedConversations,
        }));

        await saveConversations(updatedConversations);
        return newConversation;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },
    [state.conversations, saveConversations],
  );

  // Add message to current conversation
  const addMessage = useCallback(
    async (content: string, role: "user" | "assistant", tokenUsage?: TokenUsage): Promise<void> => {
      if (!state.currentConversation) {
        throw new Error("No active conversation");
      }

      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role,
        content,
        timestamp: new Date().toISOString(),
        tokenUsage,
      };

      const updatedConversation = {
        ...state.currentConversation,
        messages: [...state.currentConversation.messages, newMessage],
        updatedAt: new Date().toISOString(),
        totalTokens: state.currentConversation.totalTokens + (tokenUsage?.total_tokens || 0),
      };

      // Update title if it's the first user message and title is still "New Chat"
      if (role === "user" && updatedConversation.title === "New Chat" && updatedConversation.messages.length === 1) {
        updatedConversation.title = content.length > 50 ? content.substring(0, 50) + "..." : content;
      }

      const updatedConversations = state.conversations.map((conv) =>
        conv.id === updatedConversation.id ? updatedConversation : conv,
      );

      setState((prev) => ({
        ...prev,
        currentConversation: updatedConversation,
        conversations: updatedConversations,
      }));

      await saveConversations(updatedConversations);
    },
    [state.currentConversation, state.conversations, saveConversations],
  );

  // Set current conversation
  const setCurrentConversation = useCallback((conversation: ChatConversation | null) => {
    setState((prev) => ({ ...prev, currentConversation: conversation }));
  }, []);

  // Delete conversation
  const deleteConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      const updatedConversations = state.conversations.filter((conv) => conv.id !== conversationId);

      setState((prev) => ({
        ...prev,
        conversations: updatedConversations,
        currentConversation: prev.currentConversation?.id === conversationId ? null : prev.currentConversation,
      }));

      await saveConversations(updatedConversations);

      showToast({
        style: Toast.Style.Success,
        title: "Conversation deleted",
      });
    },
    [state.conversations, saveConversations],
  );

  // Clear all conversations
  const clearAllConversations = useCallback(async (): Promise<void> => {
    setState((prev) => ({
      ...prev,
      conversations: [],
      currentConversation: null,
    }));

    await LocalStorage.removeItem(CHAT_STORAGE_KEY);

    showToast({
      style: Toast.Style.Success,
      title: "All conversations cleared",
    });
  }, []);

  // Get conversation messages for AI context
  const getConversationContext = useCallback((conversation: ChatConversation) => {
    return conversation.messages.map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));
  }, []);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    ...state,
    createConversation,
    addMessage,
    setCurrentConversation,
    deleteConversation,
    clearAllConversations,
    getConversationContext,
    loadConversations,
  };
}
