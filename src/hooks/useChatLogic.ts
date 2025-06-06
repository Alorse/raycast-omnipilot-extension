import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { showToast, Toast, getPreferenceValues } from '@raycast/api';
import { useChat } from './useChat';
import { useAIStreaming } from './useAIStreaming';
import { OpenRouterMessage } from '../types';
import { ChatMessage } from '../types/chat';
import { LLMConfigManager } from '../services/llmConfigManager';
import { getProviderName } from '../utils/providers';

interface Preferences {
  systemPrompt: string;
}

export interface ChatLogicState {
  // State
  isInitialized: boolean;
  searchText: string;
  selectedConversationId: string;
  currentConfig: {
    model: string;
    provider: string;
    configName?: string;
  } | null;

  // Computed
  currentMessages: ChatMessage[];
  allMessages: ChatMessage[];
  chatMarkdown: string;

  // Actions
  setSearchText: (text: string) => void;
  handleSendMessage: (messageText: string) => Promise<void>;
  handleConversationChange: (conversationId: string) => void;
  handleDeleteConversation: (conversationId: string) => Promise<void>;
  handleCreateConversation: () => Promise<void>;
  formatMessageTime: (timestamp: string) => string;
}

export function useChatLogic() {
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

  const { response, isLoading, tokenUsage, chatWithHistory, clearResponse } =
    useAIStreaming();
  const [isInitialized, setIsInitialized] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>('');
  const [currentConfig, setCurrentConfig] = useState<{
    model: string;
    provider: string;
    configName?: string;
  } | null>(null);

  const responseStartRef = useRef<string>('');
  const processingResponseRef = useRef(false);

  // Single initialization effect
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

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to initialize chat',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    initializeChat();
  }, []);

  // Handle conversation management after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const manageConversations = async () => {
      if (conversations.length === 0) {
        // Create initial conversation if none exists
        await createConversation();
      } else if (!currentConversation) {
        // Set the first conversation as current if none is selected
        setCurrentConversation(conversations[0]);
        setSelectedConversationId(conversations[0].id);
      } else {
        // Update selectedConversationId if currentConversation changes
        setSelectedConversationId(currentConversation.id);
      }
    };

    manageConversations().catch((error) => {
      console.error('Failed to manage conversations:', error);
    });
  }, [
    conversations,
    isInitialized,
    conversations.length,
    currentConversation,
    createConversation,
    setCurrentConversation,
  ]);

  // Handle AI response processing
  useEffect(() => {
    if (
      response &&
      !isLoading &&
      !processingResponseRef.current &&
      currentConversation
    ) {
      // Only process if response has changed from what we started with
      if (response !== responseStartRef.current && response.trim()) {
        processingResponseRef.current = true;

        addMessage(response, 'assistant', tokenUsage || undefined)
          .then(() => {
            clearResponse();
            responseStartRef.current = '';
            processingResponseRef.current = false;
          })
          .catch((error) => {
            console.error('Failed to add AI response:', error);
            processingResponseRef.current = false;
          });
      }
    }
  }, [
    response,
    isLoading,
    tokenUsage,
    currentConversation,
    addMessage,
    clearResponse,
  ]);

  const handleSendMessage = useCallback(
    async (messageText: string) => {
      const userMessage = messageText.trim();
      if (!userMessage || !currentConversation || isLoading) return;

      try {
        // Clear the search text immediately
        setSearchText('');

        // Add user message
        await addMessage(userMessage, 'user');

        // Get conversation context for AI and build complete message history
        const conversationHistory = getConversationContext(currentConversation);

        // Build the complete message array including system prompt and conversation history
        const messages: OpenRouterMessage[] = [
          {
            role: 'system',
            content:
              preferences.systemPrompt ||
              'You are a helpful AI assistant. Maintain context from the conversation history and provide thoughtful, relevant responses.',
          },
          ...conversationHistory,
          {
            role: 'user',
            content: userMessage,
          },
        ];

        // Start AI response
        responseStartRef.current = response;
        processingResponseRef.current = false;

        await chatWithHistory(messages);
      } catch (error) {
        console.error('Failed to send message:', error);
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to send message',
          message: error instanceof Error ? error.message : 'Unknown error',
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
      } else {
        console.error('Conversation not found with ID:', conversationId);
      }
    },
    [conversations, setCurrentConversation],
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      const { confirmAlert, Alert } = await import('@raycast/api');

      const confirmed = await confirmAlert({
        title: 'Delete Conversation',
        message:
          'Are you sure you want to delete this conversation? This action cannot be undone.',
        primaryAction: {
          title: 'Delete',
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        await deleteConversation(conversationId);

        // Switch to another conversation if the current one was deleted
        if (currentConversation?.id === conversationId) {
          const remainingConversations = conversations.filter(
            (c) => c.id !== conversationId,
          );
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
    [
      currentConversation,
      conversations,
      deleteConversation,
      setCurrentConversation,
      createConversation,
    ],
  );

  const handleCreateConversation = useCallback(async () => {
    await createConversation();
    showToast({
      style: Toast.Style.Success,
      title: 'New chat created',
    });
  }, [createConversation]);

  const formatMessageTime = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Computed values
  const currentMessages = useMemo(() => {
    return currentConversation?.messages || [];
  }, [currentConversation?.messages]);
  
  const allMessages = useMemo(() => {
    const messages = [...currentMessages];
    
    // Add current streaming response as a temporary message
    if (isLoading && response) {
      messages.push({
        id: 'streaming',
        role: 'assistant' as const,
        content: response,
        timestamp: new Date().toISOString(),
      });
    }
    
    return messages;
  }, [currentMessages, isLoading, response]);

  // Build chat content as markdown for better readability
  const buildChatMarkdown = useCallback(() => {
    if (!currentConversation || allMessages.length === 0) {
      return `# 💬 Chat with ${currentConfig?.model || 'AI'}

*No messages yet. Type your message above and press Enter to start the conversation.*`;
    }

    const chatContent = allMessages
      .map((message) => {
        const role =
          message.role === 'user' ? '👤 **You**' : '🤖 **Assistant**';
        const time = formatMessageTime(message.timestamp);
        const tokens = message.tokenUsage
          ? ` *(${message.tokenUsage.total_tokens} tokens)*`
          : '';

        return `${role} ${tokens} - ${time}

${message.content}

---`;
      })
      .join('\n\n');

    return chatContent;
  }, [allMessages, currentConversation, currentConfig, formatMessageTime]);

  return {
    // State
    isInitialized,
    searchText,
    selectedConversationId,
    currentConfig,

    // Computed
    currentMessages,
    allMessages,
    chatMarkdown: buildChatMarkdown(),

    // Actions
    setSearchText,
    handleSendMessage,
    handleConversationChange,
    handleDeleteConversation,
    handleCreateConversation,
    formatMessageTime,

    // From hooks
    conversations,
    currentConversation,
    response,
    isLoading,
    tokenUsage,
  };
}
