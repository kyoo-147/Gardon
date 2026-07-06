import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ChatSessionManager - Utility for managing user-specific chat sessions
 * Fixes session management issues and ensures user isolation
 */
class ChatSessionManager {
  
  /**
   * Clear all global chat data that may be contaminated
   */
  static async clearGlobalChatData() {
    try {
      console.log('🧹 Clearing potentially corrupted global chat data...');
      
      // Remove old global keys that may have cross-user contamination
      const globalKeys = [
        'chatbot_messages',
        'chatbot_history',
        'chat_data',
        'bot_messages'
      ];
      
      for (const key of globalKeys) {
        await AsyncStorage.removeItem(key);
        console.log(`✅ Cleared global key: ${key}`);
      }
      
      return { success: true, message: 'Global chat data cleared successfully' };
    } catch (error) {
      console.error('❌ Error clearing global chat data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user-specific storage key
   */
  static getUserChatKey(userId) {
    if (!userId) {
      throw new Error('User ID is required for chat storage');
    }
    return `chatbot_messages_${userId}`;
  }

  /**
   * Save user-specific chat messages
   */
  static async saveUserMessages(userId, messages) {
    try {
      if (!userId) {
        console.warn('No user ID provided, cannot save messages');
        return { success: false, error: 'No user ID' };
      }
      
      const userKey = this.getUserChatKey(userId);
      await AsyncStorage.setItem(userKey, JSON.stringify(messages));
      console.log(`✅ Saved ${messages.length} messages for user: ${userId}`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving user messages:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load user-specific chat messages
   */
  static async loadUserMessages(userId) {
    try {
      if (!userId) {
        console.warn('No user ID provided, cannot load messages');
        return { success: false, messages: [] };
      }
      
      const userKey = this.getUserChatKey(userId);
      const savedMessages = await AsyncStorage.getItem(userKey);
      
      if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        console.log(`✅ Loaded ${messages.length} messages for user: ${userId}`);
        return { success: true, messages };
      } else {
        console.log(`📝 No saved messages found for user: ${userId}`);
        return { success: true, messages: [] };
      }
    } catch (error) {
      console.error('❌ Error loading user messages:', error);
      return { success: false, messages: [], error: error.message };
    }
  }

  /**
   * Clear user-specific chat messages
   */
  static async clearUserMessages(userId) {
    try {
      if (!userId) {
        console.warn('No user ID provided, cannot clear messages');
        return { success: false, error: 'No user ID' };
      }
      
      const userKey = this.getUserChatKey(userId);
      await AsyncStorage.removeItem(userKey);
      console.log(`✅ Cleared messages for user: ${userId}`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing user messages:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Migrate old global data to user-specific storage
   */
  static async migrateGlobalToUserSpecific(userId) {
    try {
      if (!userId) {
        console.warn('No user ID provided for migration');
        return { success: false, error: 'No user ID' };
      }

      console.log(`🔄 Migrating global chat data to user-specific storage for: ${userId}`);
      
      // Try to get old global data
      const globalData = await AsyncStorage.getItem('chatbot_messages');
      if (globalData) {
        const messages = JSON.parse(globalData);
        
        // Save to user-specific key
        const userKey = this.getUserChatKey(userId);
        await AsyncStorage.setItem(userKey, JSON.stringify(messages));
        
        // Remove global data
        await AsyncStorage.removeItem('chatbot_messages');
        
        console.log(`✅ Migrated ${messages.length} messages to user-specific storage`);
        return { success: true, migrated: messages.length };
      } else {
        console.log('📝 No global data found to migrate');
        return { success: true, migrated: 0 };
      }
    } catch (error) {
      console.error('❌ Error during migration:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all stored chat users (for debugging)
   */
  static async getAllChatUsers() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const chatKeys = allKeys.filter(key => key.startsWith('chatbot_messages_'));
      const userIds = chatKeys.map(key => key.replace('chatbot_messages_', ''));
      
      console.log(`📊 Found chat data for ${userIds.length} users:`, userIds);
      return { success: true, userIds };
    } catch (error) {
      console.error('❌ Error getting chat users:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate user session integrity
   */
  static async validateUserSession(userId) {
    try {
      if (!userId) {
        return { valid: false, error: 'No user ID provided' };
      }

      const userKey = this.getUserChatKey(userId);
      const userData = await AsyncStorage.getItem(userKey);
      
      if (userData) {
        const messages = JSON.parse(userData);
        const isValid = Array.isArray(messages) && messages.every(msg => 
          msg.id && msg.timestamp && (msg.sender || msg.isBot !== undefined)
        );
        
        if (isValid) {
          console.log(`✅ User session valid for: ${userId}`);
          return { valid: true, messageCount: messages.length };
        } else {
          console.warn(`⚠️ Invalid message format for user: ${userId}`);
          return { valid: false, error: 'Invalid message format' };
        }
      } else {
        console.log(`📝 No session data found for user: ${userId}`);
        return { valid: true, messageCount: 0 };
      }
    } catch (error) {
      console.error('❌ Error validating user session:', error);
      return { valid: false, error: error.message };
    }
  }
}

export default ChatSessionManager;
