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
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMqtt } from '../context/MqttContext';
import { useChatBot } from '../context/ChatBotContext';
import ChatBotAPI from '../services/ChatBotAPI';
import VoiceInput from './VoiceInput';
import { COLORS } from '../constants';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const BottomSheetChatBot = ({ isVisible, onClose }) => {
  const theme = useTheme();
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
  
  // FIXED: Higher bottom sheet configuration for better visibility
  const maxHeight = screenHeight * 0.85; // 85% of screen - MUCH HIGHER
  const minHeight = screenHeight * 0.65;  // 65% of screen - GUARANTEED input visibility
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
      // Clear corrupted cached messages
      await AsyncStorage.removeItem('chatbot_messages');
      
      const welcomeMessage = {
        id: Date.now().toString(),
        text: 'Xin chào! Tôi là LyLy - trợ lý AI thông minh của gia đình bạn 🤖✨\n\nTôi có thể giúp bạn:\n🏠 Kiểm tra và điều khiển thiết bị IoT\n🌤️ Xem thông tin thời tiết\n📊 Theo dõi trạng thái hệ thống\n💬 Trò chuyện và hỗ trợ 24/7\n\nHãy nói cho tôi biết bạn cần hỗ trợ gì nhé!',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        intent: 'welcome',
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.log('Error initializing chat:', error);
      const welcomeMessage = {
        id: Date.now().toString(),
        text: 'Xin chào! Tôi là LyLy, trợ lý AI của bạn. Tôi sẵn sàng hỗ trợ!',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        intent: 'welcome',
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const saveMessages = useCallback(async (newMessages) => {
    try {
      await AsyncStorage.setItem('chatbot_messages', JSON.stringify(newMessages));
    } catch (error) {
      console.log('Error saving messages:', error);
    }
  }, []);

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

      // NEW: Handle NAVIN-AGENT-AI API response format: {success: true, data: {response, intent, type, responseTime}}
      let responseText = 'Xin lỗi, LyLy không thể xử lý yêu cầu này lúc này.';
      let intent = 'general_chat';
      let responseType = 'text';
      let responseTime = null;
      
      try {
        if (typeof response === 'string') {
          responseText = response;
        } else if (response && typeof response === 'object') {
          // NEW API format: {success: true, data: {response, intent, type, responseTime}}
          if (response.success && response.data) {
            responseText = response.data.response || response.data;
            intent = response.intent || 'general_chat';
            responseType = response.type || 'text'; 
            responseTime = response.responseTime;
          }
          // Fallback for local processing format
          else if (response.data && typeof response.data === 'string') {
            responseText = response.data;
          }
          // Handle direct response object
          else if (response.response) {
            responseText = response.response;
            intent = response.intent || 'general_chat';
            responseType = response.type || 'text';
          }
          // Legacy format handling
          else if (response.message && typeof response.message === 'string') {
            responseText = response.message;
          }
        }
      } catch (extractError) {
        console.error('Error extracting response text:', extractError);
        responseText = 'Xin lỗi, LyLy gặp lỗi khi xử lý phản hồi.';
      }
      
      // Ensure it's always a string
      if (typeof responseText !== 'string' || !responseText.trim()) {
        responseText = 'Xin lỗi, LyLy không thể xử lý yêu cầu này lúc này.';
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

      // Vietnamese TTS for LyLy responses
      if (responseText.length < 200) {
        Speech.speak(responseText, {
          language: 'vi-VN',
          rate: 0.8,
        });
      }

      // Log NAVIN-AGENT response details
      console.log('NAVIN-AGENT Response:', {
        intent,
        type: responseType,
        responseTime,
        textLength: responseText.length
      });

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Xin lỗi, LyLy đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
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
            await AsyncStorage.removeItem('chatbot_messages');
            initializeChatBot();
          }
        },
      ]
    );
  }, [initializeChatBot]);

  const renderMessage = useCallback(({ item }) => {
    const isUser = item.sender === 'user';
    const isError = item.type === 'error';
    
    // SAFETY: Ensure text is always string
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
        marginVertical: 4,
        marginHorizontal: 16,
      }}>
        {!isUser && (
          <Avatar.Icon
            size={32}
            icon="leaf"
            style={{ 
              backgroundColor: isError ? '#F44336' : COLORS.secondary,
              marginRight: 12,
              marginTop: 4,
            }}
          />
        )}
        
        <Surface
          style={{
            maxWidth: '75%',
            padding: 12,
            borderRadius: 16,
            backgroundColor: isUser 
              ? COLORS.primary 
              : isError 
                ? '#FFEBEE' 
                : COLORS.surface,
            borderBottomRightRadius: isUser ? 4 : 16,
            borderBottomLeftRadius: isUser ? 16 : 4,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
          }}
        >
          <Text style={{
            color: isUser 
              ? COLORS.white 
              : isError 
                ? '#D32F2F' 
                : COLORS.text,
            fontSize: 15,
            lineHeight: 20,
          }}>
            {messageText}
          </Text>
          
          <Text style={{
            color: isUser 
              ? theme.colors.onPrimary + '80' 
              : theme.colors.outline,
            fontSize: 10,
            marginTop: 4,
            textAlign: isUser ? 'right' : 'left',
          }}>
            {new Date(item.timestamp).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </Surface>
        
        {isUser && (
          <Avatar.Icon
            size={28}
            icon="account"
            style={{ 
              backgroundColor: theme.colors.secondary,
              marginLeft: 8,
              marginTop: 4,
            }}
          />
        )}
      </View>
    );
  }, [theme]);

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

      {/* Bottom Sheet */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: maxHeight,
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          transform: [{ translateY }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        {/* SIMPLE LAYOUT STRUCTURE - NO CONFLICTS */}
        
        {/* Drag Handle */}
        <View
          {...panResponder.panHandlers}
          style={{
            alignItems: 'center',
            paddingVertical: 10,
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          <View style={{
            width: 40,
            height: 4,
            backgroundColor: theme.colors.outline,
            borderRadius: 2,
          }} />
        </View>

        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            backgroundColor: COLORS.surface,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar.Icon
              size={40}
              icon="robot"
              style={{ backgroundColor: COLORS.primary, marginRight: 16 }}
            />
            <View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.text }}>
                🌱 Garden AI Assistant
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: connectionStatus === 'online' ? COLORS.success : COLORS.error,
                  marginRight: 6,
                }} />
                <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                  {connectionStatus === 'online' ? 'Ready to help with your garden' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row' }}>
            <IconButton 
              icon="delete" 
              size={20} 
              onPress={clearChat} 
              iconColor={COLORS.textSecondary}
            />
            <IconButton 
              icon="close" 
              size={20} 
              onPress={onClose}
              iconColor={COLORS.textSecondary}
            />
          </View>
        </View>

        {/* Messages Container - SIMPLE: Takes available space leaving room for input */}
        <View style={{ 
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingBottom: 120, // Increased padding to ensure input space
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
              bottom: 20,
              left: 16,
              right: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar.Icon
                  size={24}
                  icon="robot"
                  style={{ backgroundColor: theme.colors.primary, marginRight: 8 }}
                />
                <Surface
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: theme.colors.surfaceVariant,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={{ 
                      marginLeft: 8, 
                      color: theme.colors.onSurfaceVariant,
                      fontSize: 14,
                    }}>
                      Đang suy nghĩ...
                    </Text>
                  </View>
                </Surface>
              </View>
            </View>
          )}
        </View>

        {/* Input Area - FIXED POSITION - ALWAYS VISIBLE */}
        <SafeAreaView style={{
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outline,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
        }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              paddingHorizontal: 16,
              paddingVertical: 16,
              minHeight: 80, // Increased height for better visibility
            }}>
              <TextInput
                style={{
                  flex: 1,
                  borderWidth: 1.5,
                  borderColor: theme.colors.outline,
                  borderRadius: 25,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  marginRight: 10,
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.onSurface,
                  fontSize: 16,
                  maxHeight: 120,
                  minHeight: 50,
                }}
                placeholder="Ask about your garden, devices, weather, or anything..."
                placeholderTextColor={COLORS.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              
              <View style={{ marginRight: 8 }}>
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
                  padding: 14,
                  borderRadius: 25,
                  backgroundColor: !inputText.trim() || isLoading ? theme.colors.outline : theme.colors.primary,
                  minWidth: 56,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="send" size={22} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>

      </Animated.View>
    </View>
  );
};

export default BottomSheetChatBot;
