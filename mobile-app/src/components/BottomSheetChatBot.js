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
  Animated,
  PanResponder,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import {
  Surface,
  IconButton,
  useTheme,
  Avatar,
  ActivityIndicator,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMqtt } from '../context/MqttContext';
import { useChatBot } from '../context/ChatBotContext';
import { useAuth } from '../context/AuthContext';
import ChatBotAPI from '../services/ChatBotAPI';
import VoiceInput from './VoiceInput';
import { COLORS } from '../constants';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

// Garden Theme Configuration for ChatBot
const CHATBOT_THEME = {
  gradient: ['#767E67', '#4C533E', '#3C3C40', '#3C3C40'],
  glassMorphism: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderRadius: 16,
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.8)',
    tertiary: 'rgba(255, 255, 255, 0.6)',
    placeholder: 'rgba(255, 255, 255, 0.5)',
  },
  messageBubble: {
    user: 'rgba(139, 195, 74, 0.9)', // Green with transparency
    bot: 'rgba(255, 255, 255, 0.15)', // Glass morphism white
    error: 'rgba(244, 67, 54, 0.15)', // Error red with transparency
  },
  accent: {
    primary: '#8BC34A',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
  }
};

const BottomSheetChatBot = ({ isVisible, onClose }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const { currentConnection, devices } = useMqtt();
  const { clearUnreadMessages, addUnreadMessage } = useChatBot();

  // Animation values for bottom sheet
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  
  // Higher bottom sheet configuration for better visibility
  const maxHeight = screenHeight * 0.85; // 85% of screen
  const minHeight = screenHeight * 0.65;  // 65% of screen
  const currentHeight = useRef(minHeight);

  // Initialize chatbot with welcome message
  useEffect(() => {
    initializeChatBot();
  }, []);

  // Keyboard event listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        if (isVisible) {
          const keyboardHeight = event.endCoordinates.height;
          const newHeight = Math.min(maxHeight, screenHeight - keyboardHeight - 50);
          
          currentHeight.current = newHeight;
          Animated.spring(translateY, {
            toValue: screenHeight - newHeight,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (isVisible) {
          currentHeight.current = minHeight;
          Animated.spring(translateY, {
            toValue: screenHeight - minHeight,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [isVisible, maxHeight, minHeight]);

  // Handle visibility changes with animation
  useEffect(() => {
    if (isVisible) {
      clearUnreadMessages();
      showBottomSheet();
    } else {
      hideBottomSheet();
    }
  }, [isVisible, clearUnreadMessages]);

  const showBottomSheet = () => {
    currentHeight.current = minHeight;
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: screenHeight - minHeight,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideBottomSheet = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: screenHeight,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Pan responder for dragging bottom sheet
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        const newHeight = currentHeight.current - gestureState.dy;
        if (newHeight >= minHeight && newHeight <= maxHeight) {
          translateY.setValue(screenHeight - newHeight);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const newHeight = currentHeight.current - gestureState.dy;
        let targetHeight = minHeight;
        
        if (gestureState.dy < -50) {
          targetHeight = maxHeight;
        } else if (gestureState.dy > 50) {
          if (newHeight < minHeight * 0.7) {
            onClose();
            return;
          }
          targetHeight = minHeight;
        } else {
          targetHeight = newHeight > (minHeight + maxHeight) / 2 ? maxHeight : minHeight;
        }

        currentHeight.current = targetHeight;
        Animated.spring(translateY, {
          toValue: screenHeight - targetHeight,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      },
    })
  ).current;

  const initializeChatBot = useCallback(async () => {
    try {
      const currentUserId = user?._id || user?.id || user?.userId;
      if (!currentUserId) {
        console.warn('No user ID available for BottomSheetChatBot session');
        // Show welcome message without saving  
        const welcomeMessage = {
          id: Date.now().toString(),
          text: '🌱 Xin chào! Tôi là Garden AI Assistant - trợ lý thông minh cho khu vườn của bạn ✨\n\nTôi có thể giúp bạn:\n🏠 Kiểm tra và điều khiển thiết bị IoT\n🌤️ Xem thông tin thời tiết\n📊 Theo dõi trạng thái hệ thống\n💬 Trò chuyện và hỗ trợ 24/7\n\nHãy nói cho tôi biết bạn cần hỗ trợ gì với khu vườn nhé!',
          sender: 'bot',
          timestamp: new Date(),
          type: 'text',
          intent: 'welcome',
        };
        setMessages([welcomeMessage]);
        return;
      }

      // Clear any corrupted global messages first
      await AsyncStorage.removeItem('chatbot_messages');
      
      const userSpecificKey = `chatbot_messages_${currentUserId}`;
      const savedMessages = await AsyncStorage.getItem(userSpecificKey);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        const welcomeMessage = {
          id: Date.now().toString(),
          text: '🌱 Xin chào! Tôi là Garden AI Assistant - trợ lý thông minh cho khu vườn của bạn ✨\n\nTôi có thể giúp bạn:\n🏠 Kiểm tra và điều khiển thiết bị IoT\n🌤️ Xem thông tin thời tiết\n📊 Theo dõi trạng thái hệ thống\n💬 Trò chuyện và hỗ trợ 24/7\n\nHãy nói cho tôi biết bạn cần hỗ trợ gì với khu vườn nhé!',
          sender: 'bot',
          timestamp: new Date(),
          type: 'text',
          intent: 'welcome',
        };
        setMessages([welcomeMessage]);
        await AsyncStorage.setItem(userSpecificKey, JSON.stringify([welcomeMessage]));
      }
    } catch (error) {
      console.log('Error initializing chat:', error);
      const welcomeMessage = {
        id: Date.now().toString(),
        text: '🌱 Xin chào! Tôi là Garden AI Assistant, trợ lý thông minh của khu vườn bạn. Tôi sẵn sàng hỗ trợ!',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        intent: 'welcome',
      };
      setMessages([welcomeMessage]);
    }
  }, [user]);

  const saveMessages = useCallback(async (newMessages) => {
    try {
      const currentUserId = user?._id || user?.id || user?.userId;
      if (!currentUserId) {
        console.warn('No user ID available, cannot save chat messages');
        return;
      }
      
      const userSpecificKey = `chatbot_messages_${currentUserId}`;
      await AsyncStorage.setItem(userSpecificKey, JSON.stringify(newMessages));
    } catch (error) {
      console.log('Error saving messages:', error);
    }
  }, [user]);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
    };

    const newMessages = [userMessage, ...messages];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Get IoT context
      const iotContext = {
        devices: devices || [],
        connectionStatus: currentConnection?.status || 'disconnected',
        topics: currentConnection?.topics || [],
      };

      const response = await ChatBotAPI.sendMessage(inputText.trim(), iotContext);
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Handle NAVIN-AGENT-AI API response format
      let responseText = 'Xin lỗi, Garden AI Assistant không thể xử lý yêu cầu này lúc này.';
      let intent = 'general_chat';
      let responseType = 'text';
      let responseTime = null;
      
      try {
        if (typeof response === 'string') {
          responseText = response;
        } else if (response && typeof response === 'object') {
          if (response.success && response.data) {
            responseText = response.data.response || response.data;
            intent = response.intent || 'general_chat';
            responseType = response.type || 'text'; 
            responseTime = response.responseTime;
          }
          else if (response.data && typeof response.data === 'string') {
            responseText = response.data;
          }
          else if (response.response) {
            responseText = response.response;
            intent = response.intent || 'general_chat';
            responseType = response.type || 'text';
          }
          else if (response.message && typeof response.message === 'string') {
            responseText = response.message;
          }
        }
      } catch (extractError) {
        console.error('Error extracting response text:', extractError);
        responseText = 'Xin lỗi, Garden AI Assistant gặp lỗi khi xử lý phản hồi.';
      }
      
      // Ensure it's always a string
      if (typeof responseText !== 'string' || !responseText.trim()) {
        responseText = 'Xin lỗi, Garden AI Assistant không thể xử lý yêu cầu này lúc này.';
      }

      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'bot',
        timestamp: new Date(),
        type: responseType,
        intent: intent,
        responseTime: responseTime,
      };

      const finalMessages = [botMessage, ...newMessages];
      setMessages(finalMessages);
      saveMessages(finalMessages);

      // Vietnamese TTS for Garden AI responses
      if (responseText.length < 200) {
        Speech.speak(responseText, {
          language: 'vi-VN',
          rate: 0.8,
        });
      }

      console.log('Garden AI Response:', {
        intent,
        type: responseType,
        responseTime,
        textLength: responseText.length
      });

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Xin lỗi, Garden AI Assistant đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'error',
      };
      const finalMessages = [errorMessage, ...newMessages];
      setMessages(finalMessages);
      saveMessages(finalMessages);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [inputText, messages, devices, currentConnection, saveMessages]);

  const handleVoiceInput = useCallback((text) => {
    setInputText(text);
  }, []);

  const handleRecordingChange = useCallback((recording) => {
    setIsRecording(recording);
  }, []);

  const clearChat = useCallback(async () => {
    Alert.alert(
      'Xóa Cuộc Trò Chuyện',
      'Bạn có chắc chắn muốn xóa tất cả tin nhắn?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            const currentUserId = user?._id || user?.id || user?.userId;
            if (currentUserId) {
              const userSpecificKey = `chatbot_messages_${currentUserId}`;
              await AsyncStorage.removeItem(userSpecificKey);
            }
            initializeChatBot();
          }
        },
      ]
    );
  }, [initializeChatBot]);

  const renderMessage = useCallback(({ item }) => {
    const isUser = item.sender === 'user';
    const isError = item.type === 'error';
    
    // Safety: Ensure text is always string
    let messageText = '';
    if (typeof item.text === 'string') {
      messageText = item.text;
    } else if (typeof item.text === 'object') {
      messageText = item.text.response || item.text.message || item.text.text || 'Tin nhắn không thể hiển thị';
    } else {
      messageText = 'Tin nhắn không thể hiển thị';
    }
    
    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginVertical: 6,
        marginHorizontal: 16,
      }}>
        {!isUser && (
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isError ? CHATBOT_THEME.accent.error : CHATBOT_THEME.accent.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            marginTop: 4,
            ...CHATBOT_THEME.glassMorphism,
            borderColor: isError ? 'rgba(244, 67, 54, 0.3)' : 'rgba(139, 195, 74, 0.3)',
          }}>
            <Ionicons 
              name={isError ? "alert-circle" : "leaf"} 
              size={20} 
              color={CHATBOT_THEME.text.primary} 
            />
          </View>
        )}
        
        <View
          style={{
            maxWidth: '75%',
            padding: 16,
            borderRadius: 20,
            ...CHATBOT_THEME.glassMorphism,
            backgroundColor: isUser 
              ? CHATBOT_THEME.messageBubble.user
              : isError 
                ? CHATBOT_THEME.messageBubble.error
                : CHATBOT_THEME.messageBubble.bot,
            borderBottomRightRadius: isUser ? 6 : 20,
            borderBottomLeftRadius: isUser ? 20 : 6,
            borderColor: isUser 
              ? 'rgba(139, 195, 74, 0.4)'
              : isError 
                ? 'rgba(244, 67, 54, 0.3)'
                : 'rgba(255, 255, 255, 0.2)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text style={{
            color: CHATBOT_THEME.text.primary,
            fontSize: 15,
            lineHeight: 22,
            fontWeight: '400',
          }}>
            {messageText}
          </Text>
          
          <Text style={{
            color: CHATBOT_THEME.text.tertiary,
            fontSize: 11,
            marginTop: 6,
            textAlign: isUser ? 'right' : 'left',
            fontWeight: '300',
          }}>
            {new Date(item.timestamp).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        
        {/* No user avatar - clean design like inspiration */}
      </View>
    );
  }, []);

  if (!isVisible) return null;

  return (
    <View style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      zIndex: 2000,
      elevation: 1000,
    }}>
      {/* Backdrop */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'black',
          opacity: backdropOpacity,
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Bottom Sheet with Garden Theme */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: maxHeight,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          transform: [{ translateY }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 15,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={CHATBOT_THEME.gradient}
          style={{
            flex: 1,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          {/* Drag Handle */}
          <View
            {...panResponder.panHandlers}
            style={{
              alignItems: 'center',
              paddingVertical: 12,
            }}
          >
            <View style={{
              width: 50,
              height: 5,
              backgroundColor: CHATBOT_THEME.text.tertiary,
              borderRadius: 3,
            }} />
          </View>

          {/* Modern Header - OPTIMIZED SIZE */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16, // Reduced from 20
              paddingVertical: 12, // Reduced from 20
              ...CHATBOT_THEME.glassMorphism,
              marginHorizontal: 16,
              marginBottom: 12, // Reduced from 16
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 36, // Reduced from 48
                height: 36, // Reduced from 48
                borderRadius: 18, // Reduced from 24
                backgroundColor: CHATBOT_THEME.accent.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10, // Reduced from 16
                ...CHATBOT_THEME.glassMorphism,
                borderColor: 'rgba(139, 195, 74, 0.4)',
              }}>
                <Ionicons name="leaf" size={18} color={CHATBOT_THEME.text.primary} /> {/* Reduced from 24 */}
              </View>
              <View>
                <Text style={{ 
                  fontSize: 15, // Reduced from 20
                  fontWeight: 'bold', 
                  color: CHATBOT_THEME.text.primary,
                  marginBottom: 1, // Reduced from 2
                }}>
                  🌱 Garden AI Assistant
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 5, // Reduced from 8
                    height: 5, // Reduced from 8
                    borderRadius: 2.5,
                    backgroundColor: connectionStatus === 'online' ? CHATBOT_THEME.accent.success : CHATBOT_THEME.accent.error,
                    marginRight: 5, // Reduced from 6
                  }} />
                  <Text style={{ 
                    fontSize: 10, // Reduced from 13
                    color: CHATBOT_THEME.text.secondary,
                    fontWeight: '500',
                  }}>
                    {connectionStatus === 'online' ? 'Ready to help with your garden' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                onPress={clearChat}
                style={{
                  width: 32, // Reduced from 40
                  height: 32, // Reduced from 40
                  borderRadius: 16, // Reduced from 20
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 6, // Reduced from 8
                }}
              >
                <Ionicons name="trash-outline" size={14} color={CHATBOT_THEME.text.secondary} /> {/* Reduced from 20 */}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32, // Reduced from 40
                  height: 32, // Reduced from 40
                  borderRadius: 16, // Reduced from 20
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={14} color={CHATBOT_THEME.text.secondary} /> {/* Reduced from 20 */}
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages Container */}
          <View style={{ 
            flex: 1,
            paddingBottom: 140,
          }}>
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ 
                paddingVertical: 8,
                paddingBottom: 20,
              }}
              inverted
              showsVerticalScrollIndicator={false}
            />

            {/* Typing Indicator */}
            {isTyping && (
              <View style={{ 
                position: 'absolute',
                bottom: 30,
                left: 16,
                right: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: CHATBOT_THEME.accent.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    ...CHATBOT_THEME.glassMorphism,
                  }}>
                    <Ionicons name="leaf" size={16} color={CHATBOT_THEME.text.primary} />
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                      borderRadius: 20,
                      ...CHATBOT_THEME.glassMorphism,
                      backgroundColor: CHATBOT_THEME.messageBubble.bot,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={CHATBOT_THEME.accent.primary} />
                      <Text style={{ 
                        marginLeft: 8, 
                        color: CHATBOT_THEME.text.primary,
                        fontSize: 14,
                        fontWeight: '500',
                      }}>
                        Đang suy nghĩ...
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Modern Floating Input Area */}
          <SafeAreaView style={{
            ...CHATBOT_THEME.glassMorphism,
            marginHorizontal: 16,
            marginBottom: 20,
            borderRadius: 28,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 10,
          }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                paddingHorizontal: 14, // Reduced from 20
                paddingVertical: 10, // Reduced from 16
                minHeight: 60, // Reduced from 80
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1, // Reduced from 1.5
                    borderColor: 'rgba(255, 255, 255, 0.2)', // Softer border
                    borderRadius: 18, // Reduced from 25
                    paddingHorizontal: 14, // Reduced from 20
                    paddingVertical: 10, // Reduced from 16
                    marginRight: 8, // Reduced from 12
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: CHATBOT_THEME.text.primary,
                    fontSize: 13, // Reduced from 16
                    maxHeight: 90, // Reduced from 120
                    minHeight: 36, // Reduced from 52
                    fontWeight: '400',
                    textAlignVertical: 'center',
                  }}
                  placeholder="Ask about your garden, devices, weather..."
                  placeholderTextColor={CHATBOT_THEME.text.placeholder}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                  onSubmitEditing={sendMessage}
                  returnKeyType="send"
                />
                
                <View style={{ marginRight: 4 }}> {/* Reduced from 8 */}
                  <VoiceInput
                    onVoiceResult={handleVoiceInput}
                    isRecording={isRecording}
                    onRecordingChange={handleRecordingChange}
                  />
                </View>
                
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={!inputText.trim() || isLoading}
                  style={{
                    width: 36, // Reduced from 52
                    height: 36, // Reduced from 52
                    borderRadius: 18, // Reduced from 26
                    backgroundColor: !inputText.trim() || isLoading 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : CHATBOT_THEME.accent.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    // Removed heavy shadows for cleaner look
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={CHATBOT_THEME.text.primary} />
                  ) : (
                    <Ionicons 
                      name="send" 
                      size={14} // Reduced from 22
                      color={!inputText.trim() ? CHATBOT_THEME.text.tertiary : CHATBOT_THEME.text.primary} 
                    />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>

        </LinearGradient>
      </Animated.View>
    </View>
  );
};

export default BottomSheetChatBot;