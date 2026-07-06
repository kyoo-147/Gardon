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
  Chip,
  ActivityIndicator,
  Button,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMqtt } from '../context/MqttContext';
import { useChatBot } from '../context/ChatBotContext';
import ChatBotAPI from '../services/ChatBotAPI';
import VoiceInput from './VoiceInput';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const SimpleChatBot = ({ isVisible, onClose }) => {
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
  
  // Bottom sheet configuration - Increased minimum height to ensure input visibility
  const maxHeight = screenHeight * 0.85; // 85% of screen
  const minHeight = screenHeight * 0.65;  // 65% of screen (increased for input visibility)
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
        // Auto expand to max height when keyboard shows
        if (isVisible && currentHeight.current < maxHeight) {
          currentHeight.current = maxHeight;
          Animated.spring(translateY, {
            toValue: screenHeight - maxHeight,
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
        // Keep expanded when keyboard hides
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
          // Swipe up - expand
          targetHeight = maxHeight;
        } else if (gestureState.dy > 50) {
          // Swipe down - collapse or close
          if (newHeight < minHeight * 0.7) {
            onClose();
            return;
          }
          targetHeight = minHeight;
        } else {
          // Small movement - snap to nearest position
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
      const savedMessages = await AsyncStorage.getItem('chatbot_messages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        // Welcome message
        const welcomeMessage = {
          id: Date.now().toString(),
          text: 'Xin chào! Tôi là trợ lý IoT của bạn. Tôi có thể giúp bạn kiểm tra thiết bị, giải quyết sự cố và tối ưu hóa hệ thống. Bạn cần hỗ trợ gì?',
          sender: 'bot',
          timestamp: new Date(),
          type: 'text',
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.log('Error loading chat history:', error);
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
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate thinking time

      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
      };

      const finalMessages = [botMessage, ...newMessages];
      setMessages(finalMessages);
      saveMessages(finalMessages);

      // Text-to-speech for bot response
      if (response.length < 200) {
        Speech.speak(response, {
          language: 'vi-VN',
          rate: 0.8,
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
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
    
    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginVertical: 4,
        marginHorizontal: 16,
      }}>
        {!isUser && (
          <Avatar.Icon
            size={28}
            icon="robot"
            style={{ 
              backgroundColor: isError ? theme.colors.error : theme.colors.primary,
              marginRight: 8,
              marginTop: 4,
            }}
          />
        )}
        
        <Surface
          style={{
            maxWidth: '75%',
            padding: 10,
            borderRadius: 16,
            backgroundColor: isUser 
              ? theme.colors.primary 
              : isError 
                ? theme.colors.errorContainer 
                : theme.colors.surfaceVariant,
            borderBottomRightRadius: isUser ? 4 : 16,
            borderBottomLeftRadius: isUser ? 16 : 4,
            elevation: 1,
          }}
        >
          <Text style={{
            color: isUser 
              ? theme.colors.onPrimary 
              : isError 
                ? theme.colors.onErrorContainer 
                : theme.colors.onSurfaceVariant,
            fontSize: 14,
            lineHeight: 18,
          }}>
            {item.text}
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

  const quickActions = [
    { id: 'devices', label: 'Thiết Bị', icon: 'phone-portrait', color: '#2196F3' },
    { id: 'mqtt', label: 'MQTT', icon: 'wifi', color: '#4CAF50' },
    { id: 'help', label: 'Trợ Giúp', icon: 'help-circle', color: '#FF9800' },
    { id: 'troubleshoot', label: 'Sự Cố', icon: 'construct', color: '#F44336' },
    { id: 'optimize', label: 'Tối Ưu', icon: 'flash', color: '#9C27B0' },
    { id: 'status', label: 'Tổng Quan', icon: 'stats-chart', color: '#00BCD4' },
  ];

  const handleQuickAction = (actionId) => {
    let message = '';
    switch (actionId) {
      case 'devices':
        message = 'Hiển thị danh sách thiết bị của tôi';
        break;
      case 'mqtt':
        message = 'Kiểm tra trạng thái kết nối MQTT';
        break;
      case 'help':
        message = 'Bạn có thể giúp tôi những gì?';
        break;
      case 'troubleshoot':
        message = 'Tôi gặp sự cố, hãy giúp tôi khắc phục';
        break;
      case 'optimize':
        message = 'Làm thế nào để tối ưu hóa hệ thống?';
        break;
      case 'status':
        message = 'Cho tôi xem tổng quan hệ thống';
        break;
      default:
        message = 'Xin chào!';
    }
    setInputText(message);
  };

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
          height: maxHeight, // Fixed height
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          transform: [{ translateY }],
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        {/* CRITICAL FIX: Proper layout structure to ensure input area is always visible */}
        <View style={{ 
          flex: 1,
          flexDirection: 'column', // Vertical layout
        }}>
          
          {/* Drag Handle */}
          <View
            {...panResponder.panHandlers}
            style={{
              alignItems: 'center',
              paddingVertical: 8,
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
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.outline,
              backgroundColor: theme.colors.surface,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar.Icon
                size={36}
                icon="robot"
                style={{ backgroundColor: theme.colors.primary, marginRight: 12 }}
              />
              <View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.onSurface }}>
                  Trợ Lý IoT
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: connectionStatus === 'online' ? '#4CAF50' : '#FFC107',
                    marginRight: 6,
                  }} />
                  <Text style={{ fontSize: 11, color: theme.colors.outline }}>
                    {isTyping ? 'Đang gõ...' : connectionStatus === 'online' ? 'Trực tuyến' : 'Đang kết nối...'}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row' }}>
              <IconButton icon="delete" size={20} onPress={clearChat} />
              <IconButton icon="close" size={20} onPress={onClose} />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={{ 
            paddingHorizontal: 16, 
            paddingVertical: 8, 
            backgroundColor: theme.colors.surface 
          }}>
            <Text style={{ 
              fontSize: 12, 
              fontWeight: '600', 
              color: theme.colors.onSurface, 
              marginBottom: 6 
            }}>
              Hành Động Nhanh
            </Text>
            <FlatList
              data={quickActions}
              renderItem={({ item }) => (
                <Chip
                  icon={item.icon}
                  onPress={() => handleQuickAction(item.id)}
                  style={{ 
                    marginRight: 6, 
                    backgroundColor: `${item.color}15`,
                    borderColor: item.color,
                    borderWidth: 1,
                  }}
                  textStyle={{ color: item.color, fontWeight: '500', fontSize: 11 }}
                >
                  {item.label}
                </Chip>
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>

          {/* Messages Container - Takes remaining space but leaves room for input */}
          <View style={{ 
            flex: 1, 
            backgroundColor: theme.colors.background,
            minHeight: 200, // Minimum height to ensure some messages are visible
          }}>
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ 
                paddingVertical: 8, 
                flexGrow: 1,
                justifyContent: 'flex-end', // Start from bottom
              }}
              inverted
              showsVerticalScrollIndicator={false}
            />

            {/* Typing Indicator */}
            {isTyping && (
              <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar.Icon
                    size={20}
                    icon="robot"
                    style={{ backgroundColor: theme.colors.primary, marginRight: 8 }}
                  />
                  <Surface
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 16,
                      backgroundColor: theme.colors.surfaceVariant,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                      <Text style={{ 
                        marginLeft: 8, 
                        color: theme.colors.onSurfaceVariant,
                        fontSize: 12,
                      }}>
                        Đang suy nghĩ...
                      </Text>
                    </View>
                  </Surface>
                </View>
              </View>
            )}
          </View>

          {/* CRITICAL: Input Area - ALWAYS VISIBLE at bottom */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{
              backgroundColor: theme.colors.surface,
              borderTopWidth: 1,
              borderTopColor: theme.colors.outline,
            }}
          >
            <SafeAreaView>
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                paddingHorizontal: 16,
                paddingVertical: 12,
                minHeight: 60, // Ensure minimum height for input area
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: theme.colors.outline,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginRight: 8,
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.onSurface,
                    fontSize: 14,
                    maxHeight: 80,
                  }}
                  placeholder="Hỏi tôi bất cứ điều gì về hệ thống IoT..."
                  placeholderTextColor={theme.colors.outline}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                  onSubmitEditing={sendMessage}
                  returnKeyType="send"
                />
                
                <View style={{ marginRight: 6 }}>
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
                    padding: 10,
                    borderRadius: 20,
                    backgroundColor: !inputText.trim() || isLoading ? theme.colors.outline : theme.colors.primary,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="send" size={18} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>

        </View>
      </Animated.View>
    </View>
  );
};

export default SimpleChatBot;
