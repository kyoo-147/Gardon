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
  
  // Bottom sheet configuration
  const maxHeight = screenHeight * 0.85; // 85% của màn hình
  const minHeight = screenHeight * 0.6;  // 60% của màn hình
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
        // Optionally adjust height when keyboard hides
        if (isVisible && currentHeight.current === maxHeight) {
          // Keep max height or revert to min - user preference
          // currentHeight.current = minHeight;
          // Animated.spring(translateY, {
          //   toValue: screenHeight - minHeight,
          //   useNativeDriver: true,
          //   tension: 100,
          //   friction: 8,
          // }).start();
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

  // Pan responder để kéo thả bottom sheet
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
          // Vuốt lên - mở rộng
          targetHeight = maxHeight;
        } else if (gestureState.dy > 50) {
          // Vuốt xuống
          if (newHeight < minHeight * 0.7) {
            // Đóng nếu kéo xuống quá nhiều
            onClose();
            return;
          } else {
            targetHeight = minHeight;
          }
        } else {
          // Snap to nearest position
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

  const initializeChatBot = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem('chatbot_messages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        const welcomeMessage = {
          id: Date.now().toString(),
          text: `🤖 Xin chào! Tôi là Trợ lý IoT của bạn.\n\nTôi có thể giúp bạn:\n• Quản lý và điều khiển thiết bị\n• Cấu hình và khắc phục sự cố MQTT\n• Giám sát và tối ưu hóa hệ thống\n• Hướng dẫn thiết lập và thực tiễn tốt nhất\n\n💡 Hãy thử hỏi: "Hiển thị thiết bị của tôi" hoặc "Trạng thái MQTT như thế nào?"\n\nTôi có thể hỗ trợ gì cho bạn hôm nay?`,
          isBot: true,
          timestamp: new Date(),
          type: 'text',
        };
        setMessages([welcomeMessage]);
        await AsyncStorage.setItem('chatbot_messages', JSON.stringify([welcomeMessage]));
      }
    } catch (error) {
      console.error('Error initializing chatbot:', error);
    }
  };

  const saveMessages = async (newMessages) => {
    try {
      await AsyncStorage.setItem('chatbot_messages', JSON.stringify(newMessages));
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
      addMessage("Xin lỗi, tôi đang gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.", true);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleDeviceCommand = (metadata) => {
    // Handle device commands from bot responses
    if (metadata.action && metadata.deviceId) {
      Alert.alert(
        'Lệnh Thiết Bị',
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
    }
  };

  const handleRecordingChange = (recording) => {
    setIsRecording(recording);
  };

  const speakMessage = (text) => {
    Speech.speak(text, {
      language: 'vi',
      pitch: 1.0,
      rate: 0.8,
    });
  };

  const clearChat = () => {
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
          },
        },
      ]
    );
  };

  const renderMessageText = (text) => {
    // Simple markdown-like formatting
    const lines = text.split('\n');
    return lines.map((line, index) => {
      let style = { lineHeight: 20, color: theme.colors.onSurfaceVariant };
      let content = line;
      
      // Handle headers
      if (line.startsWith('##')) {
        content = line.replace('##', '').trim();
        style = { ...style, fontSize: 16, fontWeight: 'bold', marginTop: 6 };
      } else if (line.startsWith('**') && line.endsWith('**')) {
        content = line.replace(/\*\*/g, '');
        style = { ...style, fontWeight: 'bold' };
      } else if (line.startsWith('•') || line.startsWith('-')) {
        style = { ...style, marginLeft: 8 };
      } else if (line.startsWith('🔹')) {
        style = { ...style, marginLeft: 4, marginTop: 2 };
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
        marginVertical: 3,
        marginHorizontal: 12,
        alignItems: 'flex-start',
      }}
    >
      {item.isBot && (
        <Avatar.Icon
          size={28}
          icon="robot"
          style={{
            backgroundColor: theme.colors.primary,
            marginRight: 8,
            marginTop: 2,
          }}
        />
      )}
      
      <View style={{ flex: 1, alignItems: item.isBot ? 'flex-start' : 'flex-end' }}>
        <Surface
          style={{
            padding: 10,
            borderRadius: 12,
            maxWidth: '85%',
            backgroundColor: item.isBot ? theme.colors.surfaceVariant : theme.colors.primary,
            elevation: 1,
          }}
        >
          <View>
            {renderMessageText(item.text)}
          </View>
          
          {item.isBot && (
            <View style={{ flexDirection: 'row', marginTop: 6, justifyContent: 'flex-end' }}>
              <IconButton
                icon="volume-high"
                size={14}
                onPress={() => speakMessage(item.text)}
                style={{ margin: 0 }}
              />
            </View>
          )}
        </Surface>
        
        <Text
          style={{
            fontSize: 10,
            color: theme.colors.outline,
            marginTop: 2,
            marginHorizontal: 6,
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

  const quickActions = [
    { id: 'devices', label: 'Thiết Bị', icon: 'phone-portrait', color: '#2196F3' },
    { id: 'mqtt', label: 'MQTT', icon: 'wifi', color: '#4CAF50' },
    { id: 'help', label: 'Trợ Giúp', icon: 'help-circle', color: '#FF9800' },
    { id: 'troubleshoot', label: 'Khắc Phục', icon: 'construct', color: '#F44336' },
    { id: 'optimize', label: 'Tối Ưu', icon: 'flash', color: '#9C27B0' },
    { id: 'status', label: 'Tổng Quan', icon: 'stats-chart', color: '#00BCD4' },
  ];

  const handleQuickAction = (actionId) => {
    let message = '';
    switch (actionId) {
      case 'devices':
        message = 'Hiển thị thiết bị của tôi và trạng thái hiện tại';
        break;
      case 'mqtt':
        message = 'Trạng thái kết nối MQTT và cấu hình như thế nào?';
        break;
      case 'help':
        message = 'Bạn có thể giúp tôi gì về hệ thống IoT?';
        break;
      case 'troubleshoot':
        message = 'Giúp tôi khắc phục các sự cố với hệ thống IoT';
        break;
      case 'optimize':
        message = 'Làm thế nào để tối ưu hóa hiệu suất hệ thống IoT?';
        break;
      case 'status':
        message = 'Cho tôi biết tổng quan về trạng thái hệ thống IoT';
        break;
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
      zIndex: 2000, // Tăng zIndex để đảm bảo che tab bar
      elevation: 1000, // Cho Android
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
          height: screenHeight, // Sử dụng toàn bộ chiều cao màn hình
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
        {/* Drag Handle */}
        <View
          {...panResponder.panHandlers}
          style={{
            alignItems: 'center',
            paddingVertical: 8,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: theme.colors.outline,
              borderRadius: 2,
            }}
          />
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
        <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.onSurface, marginBottom: 6 }}>
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

        {/* Messages */}
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 6 }}
          inverted
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
                  padding: 8,
                  borderRadius: 12,
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <SafeAreaView style={{ backgroundColor: theme.colors.surface }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                paddingBottom: Platform.OS === 'ios' ? 12 : 16,
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
      </Animated.View>
    </View>
  );
};

export default SimpleChatBot;
