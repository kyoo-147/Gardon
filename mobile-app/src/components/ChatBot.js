import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Surface,
  IconButton,
  useTheme,
  Avatar,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMqtt } from '../context/MqttContext';
import { useChatBot } from '../context/ChatBotContext';
import { useAuth } from '../context/AuthContext';
import ChatBotAPI from '../services/ChatBotAPI';
import VoiceInput from './VoiceInput';

const { height: screenHeight } = Dimensions.get('window');

const ChatBot = ({ isVisible, onClose }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const bottomSheetRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [userSettings, setUserSettings] = useState({
    autoSpeech: false,
    quickActions: true,
    notifications: true,
    autoSend: false,
    responseDelay: 'normal',
    voiceEnabled: true,
    conversationHistory: true,
  });
  const { currentConnection, devices } = useMqtt();
  const { clearUnreadMessages, addUnreadMessage } = useChatBot();

  const snapPoints = ['25%', '50%', '90%'];

  // Load user settings
  useEffect(() => {
    loadUserSettings();
  }, []);

  // Initialize chatbot with welcome message
  useEffect(() => {
    initializeChatBot();
  }, []);

  // Handle visibility changes
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
      clearUnreadMessages(); // Clear unread count when chat opens
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible, clearUnreadMessages]);

  const loadUserSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('chatbot_user_settings');
      if (savedSettings) {
        setUserSettings({ ...userSettings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const initializeChatBot = async () => {
    try {
      const currentUserId = user?._id || user?.id || user?.userId;
      if (!currentUserId) {
        console.warn('No user ID available for ChatBot session');
        // Show welcome message without saving
        const welcomeMessage = {
          id: Date.now().toString(),
          text: `🤖 Hello! I'm your IoT Assistant.\n\nI can help you with:\n• Device management and control\n• MQTT configurations and troubleshooting\n• System monitoring and optimization\n• Setup guidance and best practices\n\n💡 Try asking: "Show me my devices" or "What's my MQTT status?"\n\nHow can I assist you today?`,
          isBot: true,
          timestamp: new Date(),
          type: 'text',
        };
        setMessages([welcomeMessage]);
        return;
      }

      const userSpecificKey = `chatbot_messages_${currentUserId}`;
      const savedMessages = await AsyncStorage.getItem(userSpecificKey);
      if (savedMessages && userSettings.conversationHistory) {
        setMessages(JSON.parse(savedMessages));
      } else {
        const welcomeMessage = {
          id: Date.now().toString(),
          text: `🤖 Hello! I'm your IoT Assistant.\n\nI can help you with:\n• Device management and control\n• MQTT configurations and troubleshooting\n• System monitoring and optimization\n• Setup guidance and best practices\n\n💡 Try asking: "Show me my devices" or "What's my MQTT status?"\n\nHow can I assist you today?`,
          isBot: true,
          timestamp: new Date(),
          type: 'text',
        };
        setMessages([welcomeMessage]);
        if (userSettings.conversationHistory) {
          await AsyncStorage.setItem(userSpecificKey, JSON.stringify([welcomeMessage]));
        }
      }
    } catch (error) {
      console.error('Error initializing chatbot:', error);
    }
  };

  const saveMessages = async (newMessages) => {
    if (!userSettings.conversationHistory) return;
    try {
      const currentUserId = user?._id || user?.id || user?.userId;
      if (!currentUserId) {
        console.warn('No user ID available, cannot save chat messages');
        return;
      }
      
      const userSpecificKey = `chatbot_messages_${currentUserId}`;
      await AsyncStorage.setItem(userSpecificKey, JSON.stringify(newMessages));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  const addMessage = (text, isBot = false, type = 'text', metadata = null) => {
    const newMessage = {
      id: Date.now().toString(),
      text,
      isBot,
      timestamp: new Date(),
      type,
      metadata,
    };

    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, newMessage];
      saveMessages(updatedMessages);
      return updatedMessages;
    });

    // Auto-speak if enabled
    if (isBot && userSettings.autoSpeech) {
      speakMessage(text);
    }

    return newMessage;
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    
    // Add user message
    addMessage(userMessage, false);
    
    setIsLoading(true);
    setIsTyping(true);

    // Apply response delay based on settings
    const delay = userSettings.responseDelay === 'fast' ? 300 : 
                  userSettings.responseDelay === 'slow' ? 2000 : 1000;

    try {
      // Prepare context for the API
      const context = {
        currentConnection: currentConnection ? {
          name: currentConnection.name,
          host: currentConnection.host,
          connected: currentConnection.connected,
        } : null,
        deviceCount: devices?.length || 0,
        devices: devices?.map(device => ({
          id: device.id,
          name: device.name,
          type: device.type,
          status: device.currentState,
        })) || [],
      };

      // Add artificial delay for UX
      await new Promise(resolve => setTimeout(resolve, delay));

      // Send to ChatBot API service
      const result = await ChatBotAPI.sendMessage(userMessage, context);
      
      if (result.success) {
        const data = result.data;
        
        // Add bot response
        const botMessage = addMessage(data.response, true, data.type || 'text', data.metadata);
        
        // Add to unread if chat is not visible
        if (!isVisible) {
          addUnreadMessage(botMessage);
        }
        
        // Handle special response types
        if (data.type === 'device_command' && data.metadata) {
          handleDeviceCommand(data.metadata);
        }
        
        // Show local processing indicator if API failed
        if (result.isLocal) {
          console.log('Response generated locally due to API unavailability');
        }
      } else {
        throw new Error('Failed to get response from ChatBot API');
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      // Final fallback
      addMessage("I'm sorry, I'm having trouble processing your request right now. Please try again later.", true);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleDeviceCommand = (metadata) => {
    // Handle device commands from bot responses
    if (metadata.action && metadata.deviceId) {
      Alert.alert(
        'Lệnh thiết bị',
        `Thực hiện ${metadata.action} trên thiết bị ${metadata.deviceId}?`,
        [
          { text: 'Hủy', style: 'cancel' },
          { 
            text: 'Thực hiện', 
            onPress: () => {
              // Execute device command through MQTT context
              console.log('Executing device command:', metadata);
              // TODO: Integrate with MQTT context for actual device control
            }
          }
        ]
      );
    }
  };

  const handleVoiceInput = (voiceText) => {
    if (voiceText && voiceText.trim()) {
      setInputText(voiceText);
      // Auto-send if enabled
      if (userSettings.autoSend) {
        setTimeout(() => sendMessage(), 500);
      }
    }
  };

  const handleRecordingChange = (recording) => {
    setIsRecording(recording);
  };

  const speakMessage = (text) => {
    Speech.speak(text, {
      language: 'en',
      pitch: 1.0,
      rate: 0.8,
    });
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            const currentUserId = user?._id || user?.id || user?.userId;
            if (currentUserId) {
              const userSpecificKey = `chatbot_messages_${currentUserId}`;
              await AsyncStorage.removeItem(userSpecificKey);
            }
            initializeChatBot();
          },
        },
      ]
    );
  };

  const renderMessageText = (text, isBot, theme) => {
    // Simple markdown-like formatting
    const lines = text.split('\n');
    const baseColor = isBot ? theme.colors.onSurfaceVariant : theme.colors.onPrimary;
    
    return lines.map((line, index) => {
      let style = { lineHeight: 22, color: baseColor };
      let content = line;
      
      // Handle headers
      if (line.startsWith('##')) {
        content = line.replace('##', '').trim();
        style = { ...style, fontSize: 16, fontWeight: 'bold', marginTop: 8 };
      } else if (line.startsWith('**') && line.endsWith('**')) {
        content = line.replace(/\*\*/g, '');
        style = { ...style, fontWeight: 'bold' };
      } else if (line.startsWith('•') || line.startsWith('-')) {
        style = { ...style, marginLeft: 8 };
      } else if (line.startsWith('🔹')) {
        style = { ...style, marginLeft: 4, marginTop: 4 };
      }
      
      return (
        <Text key={index} style={style}>
          {content}
          {index < lines.length - 1 ? '\n' : ''}
        </Text>
      );
    });
  };

  const renderMessage = ({ item }) => (
    <View
      style={{
        flexDirection: 'row',
        marginVertical: 4,
        marginHorizontal: 16,
        alignItems: 'flex-start',
      }}
    >
      {item.isBot && (
        <Avatar.Icon
          size={32}
          icon="robot"
          style={{
            backgroundColor: theme.colors.primary,
            marginRight: 8,
            marginTop: 4,
          }}
        />
      )}
      
      <View style={{ flex: 1, alignItems: item.isBot ? 'flex-start' : 'flex-end' }}>
        <Surface
          style={{
            padding: 12,
            borderRadius: 16,
            maxWidth: '80%',
            backgroundColor: item.isBot ? theme.colors.surfaceVariant : theme.colors.primary,
            elevation: 1,
          }}
        >
          <View style={{ fontSize: 16 }}>
            {renderMessageText(item.text, item.isBot, theme)}
          </View>
          
          {item.isBot && (
            <View style={{ flexDirection: 'row', marginTop: 8, justifyContent: 'flex-end' }}>
              <IconButton
                icon="volume-high"
                size={16}
                onPress={() => speakMessage(item.text)}
                style={{ margin: 0 }}
              />
            </View>
          )}
        </Surface>
        
        <Text
          style={{
            fontSize: 12,
            color: theme.colors.outline,
            marginTop: 4,
            marginHorizontal: 8,
          }}
        >
          {new Date(item.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </View>
  );

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleSheetChanges = useCallback((index) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const quickActions = [
    { id: 'devices', label: 'My Devices', icon: 'phone-portrait', color: '#2196F3' },
    { id: 'mqtt', label: 'MQTT Status', icon: 'wifi', color: '#4CAF50' },
    { id: 'help', label: 'Help', icon: 'help-circle', color: '#FF9800' },
    { id: 'troubleshoot', label: 'Troubleshoot', icon: 'construct', color: '#F44336' },
    { id: 'optimize', label: 'Optimize', icon: 'flash', color: '#9C27B0' },
    { id: 'status', label: 'Overview', icon: 'stats-chart', color: '#00BCD4' },
  ];

  const handleQuickAction = (actionId) => {
    let message = '';
    switch (actionId) {
      case 'devices':
        message = 'Show me my devices and their current status';
        break;
      case 'mqtt':
        message = 'What is my MQTT connection status and configuration?';
        break;
      case 'help':
        message = 'What can you help me with regarding my IoT setup?';
        break;
      case 'troubleshoot':
        message = 'Help me troubleshoot any issues with my IoT system';
        break;
      case 'optimize':
        message = 'How can I optimize my IoT system performance?';
        break;
      case 'status':
        message = 'Give me a complete overview of my IoT system status';
        break;
    }
    setInputText(message);
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.outline }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outline,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar.Icon
              size={40}
              icon="robot"
              style={{ backgroundColor: theme.colors.primary, marginRight: 12 }}
            />
            <View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.onSurface }}>
                IoT Assistant
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: connectionStatus === 'online' ? '#4CAF50' : '#FFC107',
                  marginRight: 6,
                }} />
                <Text style={{ fontSize: 12, color: theme.colors.outline }}>
                  {isTyping ? 'Typing...' : connectionStatus === 'online' ? 'Online' : 'Connecting...'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="delete" onPress={clearChat} />
            <IconButton icon="close" onPress={onClose} />
          </View>
        </View>

        {/* Quick Actions */}
        {userSettings.quickActions && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.onSurface, marginBottom: 8 }}>
              Quick Actions
            </Text>
            <FlatList
              data={quickActions}
              renderItem={({ item }) => (
                <Chip
                  icon={item.icon}
                  onPress={() => handleQuickAction(item.id)}
                  style={{ 
                    marginRight: 8, 
                    backgroundColor: `${item.color}15`,
                    borderColor: item.color,
                    borderWidth: 1,
                  }}
                  textStyle={{ color: item.color, fontWeight: '500' }}
                >
                  {item.label}
                </Chip>
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        {/* Messages */}
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 8 }}
          inverted
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar.Icon
                size={24}
                icon="robot"
                style={{ backgroundColor: theme.colors.primary, marginRight: 8 }}
              />
              <Surface
                style={{
                  padding: 12,
                  borderRadius: 16,
                  backgroundColor: theme.colors.surfaceVariant,
                }}
              >
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </Surface>
            </View>
          </View>
        )}

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: theme.colors.outline,
              backgroundColor: theme.colors.surface,
            }}
          >
            <TextInput
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: theme.colors.outline,
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginRight: 8,
                backgroundColor: theme.colors.surface,
                color: theme.colors.onSurface,
                fontSize: 16,
              }}
              placeholder="Ask me anything about your IoT setup..."
              placeholderTextColor={theme.colors.outline}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            
            {userSettings.voiceEnabled && (
              <View style={{ marginRight: 8 }}>
                <VoiceInput
                  onVoiceResult={handleVoiceInput}
                  isRecording={isRecording}
                  onRecordingChange={handleRecordingChange}
                />
              </View>
            )}
            
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
              style={{
                padding: 12,
                borderRadius: 24,
                backgroundColor: !inputText.trim() || isLoading ? theme.colors.outline : theme.colors.primary,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default ChatBot;
