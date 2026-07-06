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
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
        marginVertical: 8,
        marginHorizontal: 16,
      }}>
        {!isUser && (
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isError ? 'rgba(244, 67, 54, 0.9)' : 'rgba(139, 195, 74, 0.9)',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
            marginTop: 4,
          }}>
            <Ionicons 
              name={isError ? "warning" : "leaf"} 
              size={16} 
              color="#FFFFFF" 
            />
          </View>
        )}
        
        <View
          style={{
            maxWidth: '75%',
            padding: 16,
            borderRadius: 20,
            backgroundColor: isUser 
              ? 'rgba(139, 195, 74, 0.9)' 
              : isError 
                ? 'rgba(244, 67, 54, 0.1)' 
                : 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            borderColor: isUser 
              ? 'rgba(139, 195, 74, 0.3)' 
              : 'rgba(255, 255, 255, 0.2)',
            marginBottom: 4,
          }}
        >
          <Text style={{
            color: isUser ? '#FFFFFF' : '#FFFFFF',
            fontSize: 15,
            lineHeight: 22,
            fontWeight: isUser ? '500' : '400',
          }}>
            {messageText}
          </Text>
          
          <Text style={{
            color: isUser ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.6)',
            fontSize: 11,
            marginTop: 6,
            textAlign: isUser ? 'right' : 'left',
          }}>
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit'
            }) : ''}
          </Text>
        </View>

        {isUser && (
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(139, 195, 74, 0.9)',
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 12,
            marginTop: 4,
          }}>
            <Ionicons name="person" size={16} color="#FFFFFF" />
          </View>
        )}
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Backdrop with Garden Theme */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          opacity: backdropOpacity,
        }}
      >
        <TouchableOpacity 
          style={{ flex: 1 }} 
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Bottom Sheet with Garden Theme Gradient */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: maxHeight,
          transform: [{ translateY }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <LinearGradient
          colors={['#767E67', '#4C533E', '#3C3C40', '#3C3C40']}
          style={{ 
            flex: 1,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          {/* Drag Handle */}
          <View
            {...panResponder.panHandlers}
            style={{
              alignItems: 'center',
              paddingVertical: 10,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <View style={{
              width: 40,
              height: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 2,
            }} />
          </View>

          {/* Header with Glass Morphism */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 16,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
              marginHorizontal: 16,
              borderRadius: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(139, 195, 74, 0.9)',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16,
              }}>
                <Ionicons name="robot" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                  🌱 Garden AI Assistant
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: connectionStatus === 'online' ? '#8BC34A' : '#FF6B6B',
                    marginRight: 6,
                  }} />
                  <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' }}>
                    {connectionStatus === 'online' ? 'Ready to help with your garden' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity 
                onPress={clearChat}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8,
                }}
              >
                <Ionicons name="trash" size={18} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages Container */}
          <View style={{ 
            flex: 1,
            paddingBottom: 120,
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

            {/* Typing Indicator with Garden Theme */}
            {isTyping && (
              <View style={{ 
                position: 'absolute',
                bottom: 20,
                left: 16,
                right: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'rgba(139, 195, 74, 0.9)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <Ionicons name="robot" size={16} color="#FFFFFF" />
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 20,
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#8BC34A" />
                      <Text style={{ 
                        marginLeft: 8, 
                        color: '#FFFFFF',
                        fontSize: 14,
                      }}>
                        Đang suy nghĩ...
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Input Area with Garden Theme */}
          <SafeAreaView style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 16,
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
                minHeight: 80,
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: 25,
                    paddingHorizontal: 18,
                    paddingVertical: 14,
                    marginRight: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: 16,
                    maxHeight: 120,
                    minHeight: 50,
                  }}
                  placeholder="Ask about your garden, devices, weather, or anything..."
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
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
                    minWidth: 56,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <LinearGradient
                    colors={!inputText.trim() || isLoading 
                      ? ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.2)'] 
                      : ['#8BC34A', '#689F38']
                    }
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  />
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="send" size={22} color="white" />
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
