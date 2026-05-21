import React, { createContext, useContext, useState, useCallback } from 'react';
import logger from '../utils/logger';

/**
 * Conversation Context - Centralized conversation state management
 * 
 * Manages conversations, messages, and active conversation across the entire app.
 * Dashboard is the primary interface, but other routes can access conversation data.
 */

const ConversationContext = createContext({
  conversations: [],
  activeConversationId: null,
  messages: [],
  selectedTool: null,
  isLoading: false,
  
  // Conversation actions
  addConversation: () => {},
  selectConversation: () => {},
  deleteConversation: () => {},
  
  // Message actions
  addMessage: () => {},
  clearMessages: () => {},
  
  // Tool actions
  selectTool: () => {},
  setActiveTool: () => {},
  clearTool: () => {},
  
  // Loading state
  setIsLoading: () => {},
});

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};

export const ConversationProvider = ({ children }) => {
  const [conversations, setConversations] = useState([
    { id: '1', title: 'Initial Consultation', date: new Date().toISOString() }
  ]);
  const [activeConversationId, setActiveConversationId] = useState('1');
  const [messages, setMessages] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Add a new conversation
  const addConversation = useCallback((title = 'New Conversation') => {
    const newConversation = {
      id: Date.now().toString(),
      title,
      date: new Date().toISOString()
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setMessages([]);
    logger.info('New conversation created', { id: newConversation.id });
    return newConversation;
  }, []);

  // Select a conversation
  const selectConversation = useCallback((conversationId) => {
    setActiveConversationId(conversationId);
    setMessages([]);
    setSelectedTool(null);
    logger.debug('Conversation selected', { id: conversationId });
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback((conversationId) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (activeConversationId === conversationId) {
      // Switch to the first remaining conversation or create a new one
      setConversations((prev) => {
        if (prev.length === 0) {
          const newConv = {
            id: Date.now().toString(),
            title: 'New Conversation',
            date: new Date().toISOString()
          };
          setMessages([]);
          setActiveConversationId(newConv.id);
          return [newConv];
        }
        setActiveConversationId(prev[0].id);
        setMessages([]);
        return prev;
      });
    }
    logger.info('Conversation deleted', { id: conversationId });
  }, [activeConversationId]);

  // Add a message to the active conversation
  // Supports (content, role) or a full message object: { role, content, citations?, toolResult?, ... }
  const addMessage = useCallback((contentOrPayload, role = 'user') => {
    if (
      contentOrPayload &&
      typeof contentOrPayload === 'object' &&
      !Array.isArray(contentOrPayload) &&
      contentOrPayload.role
    ) {
      const message = {
        id: contentOrPayload.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        ...contentOrPayload,
        timestamp: contentOrPayload.timestamp || new Date(),
      };
      setMessages((prev) => [...prev, message]);
      logger.debug('Message added', { messageId: message.id, role: message.role, conversationId: activeConversationId });
      return message;
    }

    const message = {
      id: Date.now().toString(),
      role,
      content: contentOrPayload,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
    logger.debug('Message added', { messageId: message.id, role, conversationId: activeConversationId });
    return message;
  }, [activeConversationId]);

  // Clear messages for the active conversation
  const clearMessages = useCallback(() => {
    setMessages([]);
    logger.debug('Messages cleared', { conversationId: activeConversationId });
  }, [activeConversationId]);

  const setActiveTool = useCallback((toolId) => {
    setSelectedTool(toolId ?? null);
    logger.debug('Tool set explicitly', { toolId });
  }, []);

  // Select a clinical tool (toggle when clicking same tool in UI)
  const selectTool = useCallback((toolId) => {
    setSelectedTool((prev) => (prev === toolId ? null : toolId));
    logger.debug('Tool selected', { toolId });
  }, []);

  // Clear selected tool
  const clearTool = useCallback(() => {
    setSelectedTool(null);
    logger.debug('Tool cleared');
  }, []);

  const value = {
    conversations,
    activeConversationId,
    messages,
    selectedTool,
    isLoading,

    addConversation,
    selectConversation,
    deleteConversation,
    addMessage,
    clearMessages,
    selectTool,
    setActiveTool,
    clearTool,
    setIsLoading,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export default ConversationContext;
