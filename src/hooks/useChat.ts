import { useState, useCallback, useEffect } from 'react';
import { LocalStorage, showToast, Toast } from '@raycast/api';
import { ChatConversation, ChatMessage, ChatState } from '../types/chat';
import { TokenUsage } from '../types';
import { LLMConfigManager } from '../services/llmConfigManager';
import { getProviderName } from '../utils/providers';

const CHAT_STORAGE_KEY = 'omni-pilot-chat-conversations';

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
      console.error('Failed to load conversations:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to load conversations',
        isLoading: false,
      }));
    }
  }, []);

  // Save conversations to storage
  const saveConversations = useCallback(
    async (conversations: ChatConversation[]) => {
      try {
        await LocalStorage.setItem(
          CHAT_STORAGE_KEY,
          JSON.stringify(conversations),
        );
      } catch (error) {
        console.error('Failed to save conversations:', error);
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to save conversation',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [],
  );

  // Create new conversation
  const createConversation = useCallback(
    async (title?: string): Promise<ChatConversation> => {
      try {
        const activeConfig = await LLMConfigManager.getActiveLLM();

        if (!activeConfig) {
          throw new Error('No active LLM configuration found');
        }

        const newConversation: ChatConversation = {
          id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: title || 'New Chat',
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
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },
    [state.conversations, saveConversations],
  );

  // Add message to a specific conversation
  const addMessage = useCallback(
    async (
      content: string,
      role: 'user' | 'assistant',
      targetConversationId: string,
      tokenUsage?: TokenUsage,
    ): Promise<void> => {
      const targetConversation = state.conversations.find(
        (conv) => conv.id === targetConversationId,
      );

      if (!targetConversation) {
        throw new Error(
          `Conversation with ID ${targetConversationId} not found`,
        );
      }

      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role,
        content,
        timestamp: new Date().toISOString(),
        tokenUsage,
      };

      const updatedConversation = {
        ...targetConversation,
        messages: [...targetConversation.messages, newMessage],
        updatedAt: new Date().toISOString(),
        totalTokens:
          targetConversation.totalTokens + (tokenUsage?.total_tokens || 0),
      };

      // Update title if it's the first user message and title is still "New Chat"
      if (
        role === 'user' &&
        updatedConversation.title === 'New Chat' &&
        updatedConversation.messages.length === 1
      ) {
        updatedConversation.title =
          content.length > 50 ? content.substring(0, 50) + '...' : content;
      }

      const updatedConversations = state.conversations.map((conv) =>
        conv.id === updatedConversation.id ? updatedConversation : conv,
      );

      // Move the updated conversation to the first position
      // This ensures that when Raycast auto-selects the first item, it's the active conversation
      const conversationIndex = updatedConversations.findIndex(
        (conv) => conv.id === updatedConversation.id,
      );
      
      if (conversationIndex > 0) {
        // Remove the conversation from its current position
        const conversation = updatedConversations.splice(conversationIndex, 1)[0];
        // Add it to the beginning of the array
        updatedConversations.unshift(conversation);
        
        console.warn(
          `📌 [CONVERSATION ORDER] Moved conversation ${updatedConversation.id} to first position`,
        );
        console.warn(
          `📌 [CONVERSATION ORDER] New order:`,
          updatedConversations.map((c) => ({ id: c.id, title: c.title })),
        );
      }

      setState((prev) => ({
        ...prev,
        currentConversation:
          prev.currentConversation?.id === targetConversationId
            ? updatedConversation
            : prev.currentConversation,
        conversations: updatedConversations,
      }));

      await saveConversations(updatedConversations);
    },
    [state.conversations, saveConversations],
  );

  // Set current conversation
  const setCurrentConversation = useCallback(
    (conversation: ChatConversation | null) => {
      setState((prev) => {
        // Only update if the conversation actually changed
        if (prev.currentConversation?.id === conversation?.id) {
          return prev; // No change needed, return same state
        }

        return { ...prev, currentConversation: conversation };
      });
    },
    [],
  );

  // Delete conversation
  const deleteConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      const updatedConversations = state.conversations.filter(
        (conv) => conv.id !== conversationId,
      );

      setState((prev) => ({
        ...prev,
        conversations: updatedConversations,
        currentConversation:
          prev.currentConversation?.id === conversationId
            ? null
            : prev.currentConversation,
      }));
      await saveConversations(updatedConversations);

      showToast({
        style: Toast.Style.Success,
        title: 'Conversation deleted',
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
      title: 'All conversations cleared',
    });
  }, []);

  // Get conversation messages for AI context
  const getConversationContext = useCallback(
    (conversation: ChatConversation) => {
      return conversation.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));
    },
    [],
  );

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
