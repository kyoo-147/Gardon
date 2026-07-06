import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChatBotContext = createContext();

export const useChatBot = () => {
  const context = useContext(ChatBotContext);
  if (!context) {
    throw new Error('useChatBot must be used within a ChatBotProvider');
  }
  return context;
};

export const ChatBotProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);
  const [isEnabled, setIsEnabled] = useState(true);

  // Load chatbot settings on initialization
  useEffect(() => {
    loadChatBotSettings();
  }, []);

  const loadChatBotSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('chatbot_settings');
      if (settings) {
        const { enabled } = JSON.parse(settings);
        setIsEnabled(enabled !== undefined ? enabled : true);
      }
    } catch (error) {
      console.error('Error loading chatbot settings:', error);
    }
  };

  const saveChatBotSettings = async (settings) => {
    try {
      await AsyncStorage.setItem('chatbot_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving chatbot settings:', error);
    }
  };

  const showChatBot = () => {
    if (isEnabled) {
      setIsVisible(true);
      setUnreadCount(0);
    }
  };

  const hideChatBot = () => {
    setIsVisible(false);
  };

  const toggleChatBot = () => {
    if (isVisible) {
      hideChatBot();
    } else {
      showChatBot();
    }
  };

  const addUnreadMessage = (message) => {
    if (!isVisible) {
      setUnreadCount(prev => prev + 1);
    }
    setLastMessage(message);
  };

  const clearUnreadMessages = () => {
    setUnreadCount(0);
  };

  const enableChatBot = async () => {
    setIsEnabled(true);
    await saveChatBotSettings({ enabled: true });
  };

  const disableChatBot = async () => {
    setIsEnabled(false);
    setIsVisible(false);
    await saveChatBotSettings({ enabled: false });
  };

  const contextValue = {
    isVisible,
    unreadCount,
    lastMessage,
    isEnabled,
    showChatBot,
    hideChatBot,
    toggleChatBot,
    addUnreadMessage,
    clearUnreadMessages,
    enableChatBot,
    disableChatBot,
  };

  return (
    <ChatBotContext.Provider value={contextValue}>
      {children}
    </ChatBotContext.Provider>
  );
};

export default ChatBotContext;
