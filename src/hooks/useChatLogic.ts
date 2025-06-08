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
  const selectedConversationIdRef = useRef<string>('');
  const [currentConfig, setCurrentConfig] = useState<{
    model: string;
    provider: string;
    configName?: string;
  } | null>(null);

  const responseStartRef = useRef<string>('');
  const processingResponseRef = useRef(false);
  const isSendingMessageRef = useRef(false); // New flag to track message sending
  const recentlyProcessedResponseRef = useRef(false); // Flag to prevent UI changes after AI response
  
  // State versions of flags for UI reactivity
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [recentlyProcessedResponse, setRecentlyProcessedResponse] = useState(false);

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
    console.warn('🔍 [CONVERSATION MANAGEMENT] useEffect triggered');
    console.warn(
      '🔍 [CONVERSATION MANAGEMENT] Dependencies - isInitialized:',
      isInitialized,
      'isLoading:',
      isLoading,
      'conversations.length:',
      conversations.length,
    );
    console.warn(
      '🔍 [CONVERSATION MANAGEMENT] Current conversation:',
      currentConversation?.id,
    );
    console.warn(
      '🔍 [CONVERSATION MANAGEMENT] Flags - processingResponse:',
      processingResponseRef.current,
      'sendingMessage:',
      isSendingMessageRef.current,
    );

    if (!isInitialized) {
      console.warn(
        '🔍 [CONVERSATION MANAGEMENT] Early return - not initialized',
      );
      return;
    }

    // Prevent conversation management interference when AI is loading, processing response, or sending message
    if (
      isLoading ||
      processingResponseRef.current ||
      isSendingMessageRef.current ||
      recentlyProcessedResponseRef.current
    ) {
      console.warn(
        '🔧 [CONVERSATION MANAGEMENT] Skipping - AI is loading, processing response, sending message, or recently processed response',
      );
      return;
    }

    const manageConversations = async () => {
      console.warn('🔧 [CONVERSATION MANAGEMENT] Managing conversations');
      console.warn(
        '🔧 [CONVERSATION MANAGEMENT] Conversations length:',
        conversations.length,
      );
      console.warn(
        '🔧 [CONVERSATION MANAGEMENT] Current conversation:',
        currentConversation?.id,
      );
      console.warn(
        '🔧 [CONVERSATION MANAGEMENT] Selected conversation ref:',
        selectedConversationIdRef.current,
      );

      if (conversations.length === 0) {
        // Create initial conversation if none exists
        console.warn(
          '🔧 [CONVERSATION MANAGEMENT] Creating initial conversation',
        );
        await createConversation();
      } else if (!currentConversation) {
        // Set the first conversation as current if none is selected
        console.warn(
          '🔧 [CONVERSATION MANAGEMENT] Setting first conversation as current:',
          conversations[0].id,
        );
        setCurrentConversation(conversations[0]);
        selectedConversationIdRef.current = conversations[0].id;
      } else {
        // Update selectedConversationId if currentConversation changes
        console.warn(
          '🔧 [CONVERSATION MANAGEMENT] Updating selectedConversationIdRef to:',
          currentConversation.id,
        );
        selectedConversationIdRef.current = currentConversation.id;
      }
      console.warn('---\n\n');
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
    isLoading, // Keep isLoading as dependency but protect with flag
  ]);

  // Sync UI state with currentConversation changes
  useEffect(() => {
    if (
      currentConversation &&
      currentConversation.id !== selectedConversationIdRef.current
    ) {
      console.warn(
        '🔄 [UI SYNC] Syncing UI state with currentConversation:',
        currentConversation.id,
      );
      selectedConversationIdRef.current = currentConversation.id;
    }
  }, [currentConversation]);

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
        console.warn('✅ [AI RESPONSE] Processing AI response');
        console.warn(
          '📍 [AI RESPONSE] Current conversation ID:',
          currentConversation.id,
        );
        console.warn(
          '📍 [AI RESPONSE] Selected conversation ID (ref):',
          selectedConversationIdRef.current,
        );
        console.warn('📊 [AI RESPONSE] Current conversation data:', {
          id: currentConversation.id,
          title: currentConversation.title,
          messageCount: currentConversation.messages.length,
        });
        console.warn(
          '💾 [AI RESPONSE] Will save response to conversation ID:',
          currentConversation.id,
        );

        processingResponseRef.current = true;
        setIsProcessingResponse(true);

        addMessage(
          response,
          'assistant',
          currentConversation.id,
          tokenUsage || undefined,
        )
          .then(() => {
            console.warn(
              '✅ [AI RESPONSE] Successfully saved response to conversation:',
              currentConversation.id,
            );
            console.warn(
              '🔒 [AI RESPONSE] About to clear processingResponseRef and responseStartRef',
            );
            console.warn(
              '🔒 [AI RESPONSE] Current flags before clearing - isLoading:',
              isLoading,
              'processingResponse:',
              processingResponseRef.current,
              'sendingMessage:',
              isSendingMessageRef.current,
            );

            clearResponse();
            responseStartRef.current = '';
            processingResponseRef.current = false;
            setIsProcessingResponse(false);

            console.warn(
              '🔓 [AI RESPONSE] Cleared all flags - isLoading:',
              isLoading,
              'processingResponse:',
              processingResponseRef.current,
              'sendingMessage:',
              isSendingMessageRef.current,
            );
            console.warn(
              '🔓 [AI RESPONSE] Current conversation after clearing:',
              currentConversation.id,
            );
            console.warn(
              '🔓 [AI RESPONSE] Selected conversation ref after clearing:',
              selectedConversationIdRef.current,
            );

            // Set flag to prevent UI changes for a brief period
            recentlyProcessedResponseRef.current = true;
            setRecentlyProcessedResponse(true);
            setTimeout(() => {
              recentlyProcessedResponseRef.current = false;
              setRecentlyProcessedResponse(false);
              console.warn(
                '🔓 [AI RESPONSE] Cleared recentlyProcessedResponse flag',
              );
            }, 1000); // 1 second protection window
          })
          .catch((error) => {
            console.error('Failed to add AI response:', error);
            processingResponseRef.current = false;
            setIsProcessingResponse(false);
          });
        console.warn('---\n\n');
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

        // Set flag to prevent conversation management interference
        isSendingMessageRef.current = true;
        setIsSendingMessage(true);

        console.warn('🚀 [SEND MESSAGE] Starting send message process');
        console.warn(
          '📍 [SEND MESSAGE] Current conversation ID:',
          currentConversation.id,
        );
        console.warn(
          '📍 [SEND MESSAGE] Selected conversation ID (ref):',
          selectedConversationIdRef.current,
        );
        console.warn('📊 [SEND MESSAGE] Current conversation data:', {
          id: currentConversation.id,
          title: currentConversation.title,
          messageCount: currentConversation.messages.length,
        });

        // Add user message
        await addMessage(userMessage, 'user', currentConversation.id);

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

        console.warn(
          '🔄 [SEND MESSAGE] About to call AI with conversation ID:',
          currentConversation.id,
        );
        console.warn(
          '🔄 [SEND MESSAGE] Selected conversation ID (ref) before AI call:',
          selectedConversationIdRef.current,
        );
        console.warn('---\n\n');

        await chatWithHistory(messages);

        // Clear flag after AI call starts
        isSendingMessageRef.current = false;
        setIsSendingMessage(false);
      } catch (error) {
        // Clear flag on error
        isSendingMessageRef.current = false;
        setIsSendingMessage(false);
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
      console.warn(
        '🔄 [CONVERSATION CHANGE] Changing conversation to:',
        conversationId,
      );
      console.warn(
        '🔄 [CONVERSATION CHANGE] Previous conversation ID:',
        selectedConversationIdRef.current,
      );
      console.warn(
        '🔄 [CONVERSATION CHANGE] Previous currentConversation ID:',
        currentConversation?.id,
      );

      // Prevent conversation changes during AI processing
      if (
        isLoading ||
        processingResponseRef.current ||
        isSendingMessageRef.current ||
        recentlyProcessedResponseRef.current
      ) {
        console.warn(
          '🚫 [CONVERSATION CHANGE] BLOCKED - AI is loading, processing response, sending message, or recently processed response',
        );
        console.warn(
          '🚫 [CONVERSATION CHANGE] Current flags - isLoading:',
          isLoading,
          'processingResponse:',
          processingResponseRef.current,
          'sendingMessage:',
          isSendingMessageRef.current,
          'recentlyProcessed:',
          recentlyProcessedResponseRef.current,
        );
        return;
      }

      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
        selectedConversationIdRef.current = conversationId;

        console.warn(
          '✅ [CONVERSATION CHANGE] Successfully changed to:',
          conversationId,
        );
        console.warn(
          '✅ [CONVERSATION CHANGE] Updated selectedConversationIdRef to:',
          selectedConversationIdRef.current,
        );
      } else {
        console.error('Conversation not found with ID:', conversationId);
      }
    },
    [conversations, setCurrentConversation, currentConversation?.id, isLoading],
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
            selectedConversationIdRef.current = remainingConversations[0].id;
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
    selectedConversationId: currentConversation?.id || '', // Use currentConversation ID directly
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

    // Blocking flags for UI protection
    isProcessingResponse,
    isSendingMessage,
    recentlyProcessedResponse,
  };
}
