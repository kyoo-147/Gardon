import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
  Dimensions,
  Animated,
  PanResponder,
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

const { height: screenHeight } = Dimensions.get('window');

const BottomSheetChatBot = ({ isVisible, onClose }) => {
  const theme = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { currentConnection, devices } = useMqtt();
  const { clearUnreadMessages } = useChatBot();

  // Simple animation
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Simple height - no complex calculations
  const sheetHeight = screenHeight * 0.6; // Fixed 60% height

  useEffect(() => {
    initializeChatBot();
  }, []);

  useEffect(() => {
    if (isVisible) {
      clearUnreadMessages();
      showSheet();
    } else {
      hideSheet();
    }
  }, [isVisible, clearUnreadMessages]);

  const showSheet = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: screenHeight - sheetHeight,
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

  const hideSheet = () => {
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

  // Simple pan responder
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(screenHeight - sheetHeight + gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100) {
          onClose();
        } else {
          showSheet();
        }
      },
    })
  ).current;

  const initializeChatBot = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('chatbot_messages');
      
      const welcomeMessage = {
        id: Date.now().toString(),
        text: 'Xin chào! Tôi là trợ lý IoT của bạn. Bạn cần hỗ trợ gì?',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.log('Error initializing chat:', error);
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
      const iotContext = {
        devices: devices || [],
        connectionStatus: currentConnection?.status || 'disconnected',
      };

      const response = await ChatBotAPI.sendMessage(inputText.trim(), iotContext);
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      let responseText = 'Xin lỗi, tôi không thể xử lý yêu cầu này.';
      
      if (typeof response === 'string') {
        responseText = response;
      } else if (response?.success && response?.data?.response) {
        responseText = response.data.response;
      } else if (response?.data) {
        responseText = response.data;
      }

      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
      };

      const finalMessages = [botMessage, ...newMessages];
      setMessages(finalMessages);

      if (responseText.length < 200) {
        Speech.speak(responseText, {
          language: 'vi-VN',
          rate: 0.8,
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'error',
      };
      const finalMessages = [errorMessage, ...newMessages];
      setMessages(finalMessages);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [inputText, messages, devices, currentConnection]);

  const handleVoiceInput = useCallback((text) => {
    setInputText(text);
  }, []);

  const handleRecordingChange = useCallback((recording) => {
    setIsRecording(recording);
  }, []);

  const clearChat = useCallback(async () => {
    Alert.alert(
      'Xóa Chat',
      'Bạn có chắc muốn xóa tất cả tin nhắn?',
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

  if (!isVisible) return null;

  return (
    <View style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      zIndex: 2000,
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
          height: sheetHeight,
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
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outline,
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
              <Text style={{ fontSize: 11, color: theme.colors.outline }}>
                {isTyping ? 'Đang gõ...' : 'Trực tuyến'}
              </Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="delete" size={20} onPress={clearChat} />
            <IconButton icon="close" size={20} onPress={onClose} />
          </View>
        </View>

        {/* Messages */}
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar.Icon
                  size={24}
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
                      marginLeft: 6, 
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

        {/* Input Area */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outline,
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
          }}>
            <TextInput
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: theme.colors.outline,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                marginRight: 8,
                backgroundColor: theme.colors.surface,
                color: theme.colors.onSurface,
                fontSize: 14,
                maxHeight: 80,
                minHeight: 40,
              }}
              placeholder="Hỏi tôi về hệ thống IoT..."
              placeholderTextColor={theme.colors.outline}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            
            <VoiceInput
              onVoiceResult={handleVoiceInput}
              isRecording={isRecording}
              onRecordingChange={handleRecordingChange}
            />
            
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
              style={{
                padding: 10,
                borderRadius: 20,
                backgroundColor: !inputText.trim() || isLoading ? theme.colors.outline : theme.colors.primary,
                marginLeft: 8,
                minWidth: 40,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

export default BottomSheetChatBot;
