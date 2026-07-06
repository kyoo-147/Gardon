import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  SafeAreaView,
  Animated,
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

const GARDEN_THEME = {
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
    user: 'rgba(139, 195, 74, 0.9)', 
    bot: 'rgba(255, 255, 255, 0.15)', 
    error: 'rgba(244, 67, 54, 0.15)', 
  },
  accent: {
    primary: '#8BC34A',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
  }
};

const getCurrentUserId = (user) => {
  if (user) {
    return user._id || user.id || user.userId;
  }
  
  // Return null instead of hardcoded fallback - forces authentication
  return null;
};

const ThinkSection = ({ content, theme }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={{ marginTop: 4, maxWidth: '90%' }}>
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 4,
          paddingHorizontal: 6,
        }}
      >
        <Ionicons 
          name={isExpanded ? "chevron-down" : "chevron-forward"} 
          size={12} 
          color={GARDEN_THEME.text.tertiary}
        />
        <Text style={{
          fontSize: 10,
          color: GARDEN_THEME.text.tertiary,
          opacity: 0.8,
          fontStyle: 'italic',
          marginLeft: 2,
        }}>
          Suy nghĩ của Garden AI
        </Text>
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={{
          marginTop: 2,
          paddingHorizontal: 8,
          paddingVertical: 6,
          ...GARDEN_THEME.glassMorphism,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderLeftWidth: 2,
          borderLeftColor: GARDEN_THEME.accent.primary + '60',
        }}>
          <Text style={{
            fontSize: 10,
            lineHeight: 14,
            color: GARDEN_THEME.text.secondary,
            opacity: 0.9,
            fontStyle: 'italic',
          }}>
            {content}
          </Text>
        </View>
      )}
    </View>
  );
};

const EasyChatBot = ({ isVisible, onClose }) => {
  const theme = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const { currentConnection, devices, controlDevice } = useMqtt();
  const { clearUnreadMessages, addUnreadMessage } = useChatBot();
  const { user } = useAuth();
  const flatListRef = React.useRef(null);

  const dot1Opacity = useRef(new Animated.Value(0.4)).current;
  const dot2Opacity = useRef(new Animated.Value(0.4)).current;
  const dot3Opacity = useRef(new Animated.Value(0.4)).current;

  const animateTypingDots = useCallback(() => {
    const animateDot = (dot, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      animateDot(dot1Opacity, 0),
      animateDot(dot2Opacity, 200),
      animateDot(dot3Opacity, 400),
    ]);

    animation.start();
    return animation;
  }, [dot1Opacity, dot2Opacity, dot3Opacity]);

  useEffect(() => {
    let animation;
    if (isTyping) {
      animation = animateTypingDots();
    } else {
      dot1Opacity.setValue(0.4);
      dot2Opacity.setValue(0.4);
      dot3Opacity.setValue(0.4);
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isTyping, animateTypingDots, dot1Opacity, dot2Opacity, dot3Opacity]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    if (isVisible) {
      initializeChatBot();
      clearUnreadMessages();
    }
  }, [isVisible, clearUnreadMessages]);

  const initializeChatBot = useCallback(async () => {
    try {
      const currentUserId = getCurrentUserId(user);
      if (!currentUserId) {
        console.warn('No user ID available, ChatBot will not persist messages');
        // Still show welcome message but don't save
        const welcomeMessage = {
          id: Date.now().toString(),
          text: '🌱 Xin chào! Tôi là Garden AI Assistant - trợ lý thông minh cho khu vườn của bạn ✨\n\nTôi có thể giúp bạn:\n🏠 Điều khiển thiết bị IoT\n🌤️ Xem thông tin thời tiết\n📊 Theo dõi hệ thống\n💬 Trò chuyện 24/7\n\nHãy nói cho tôi biết bạn cần gì!',
          isBot: true,
          timestamp: new Date(),
          type: 'text',
        };
        setMessages([welcomeMessage]);
        return;
      }

      const userSpecificKey = `chatbot_messages_${currentUserId}`;
      const savedMessages = await AsyncStorage.getItem(userSpecificKey);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        const welcomeMessage = {
          id: Date.now().toString(),
          text: '🌱 Xin chào! Tôi là Garden AI Assistant - trợ lý thông minh cho khu vườn của bạn ✨\n\nTôi có thể giúp bạn:\n🏠 Điều khiển thiết bị IoT\n🌤️ Xem thông tin thời tiết\n📊 Theo dõi hệ thống\n💬 Trò chuyện 24/7\n\nHãy nói cho tôi biết bạn cần gì!',
          isBot: true,
          timestamp: new Date(),
          type: 'text',
        };
        setMessages([welcomeMessage]);
        await AsyncStorage.setItem(userSpecificKey, JSON.stringify([welcomeMessage]));
      }
    } catch (error) {
      console.error('Error initializing chatbot:', error);
    }
  }, [user]);

  const saveMessages = async (newMessages) => {
    try {
      const currentUserId = getCurrentUserId(user);
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

    return newMessage;
  };

  const addTypingIndicator = () => {
    const typingMessage = {
      id: 'typing-indicator',
      text: '',
      isBot: true,
      timestamp: new Date(),
      type: 'typing',
      metadata: null,
    };

    setMessages(prevMessages => [...prevMessages, typingMessage]);
  };

  const removeTypingIndicator = () => {
    setMessages(prevMessages => prevMessages.filter(msg => msg.id !== 'typing-indicator'));
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    
    addMessage(userMessage, false);
    
    addTypingIndicator();
    setIsLoading(true);
    setIsTyping(true);

    try {
      const currentUserId = getCurrentUserId(user);
      console.log('👤 Current user ID:', currentUserId);
      
      const iotContext = {
        currentUserId: currentUserId,
        
        mqttStatus: currentConnection?.connected ? 'connected' : 'disconnected',
        currentConnection: currentConnection ? {
          name: currentConnection.name,
          host: currentConnection.host,
          port: currentConnection.port,
          connected: currentConnection.connected,
          status: currentConnection.status,
        } : null,
        currentConfig: currentConnection,
        
        devices: devices?.map(device => ({
          _id: device._id,
          id: device.id || device._id,
          name: device.name,
          room: device.room,
          type: device.type,
          widgetType: device.widgetType,
          currentState: device.currentState,
          mqtt: device.mqtt,
        })) || [],
        deviceCount: devices?.length || 0,
        
        rooms: [...new Set(devices?.filter(d => d.room).map(d => d.room) || [])],
        
        timestamp: new Date().toISOString(),
        source: 'mobile-app',
        hasIoTDevices: devices && devices.length > 0,
        platform: 'react-native'
      };

      const result = await ChatBotAPI.sendMessage(userMessage, iotContext);
      
      removeTypingIndicator();
      
      if (result.success) {
        const data = result;
        
        const botMessage = addMessage(data.response || data, true, data.type || 'text', data.metadata);
        
        if (!isVisible) {
          addUnreadMessage(botMessage);
        }
        
        if ((data.type === 'device_command' || data.intent === 'device_control') && data.metadata?.needsDeviceControl) {
          handleDeviceCommand(data.metadata);
        }
        
        if (result.isLocal) {
          console.log('Response generated locally due to API unavailability');
        }
      } else {
        throw new Error('Failed to get response from ChatBot API');
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      removeTypingIndicator();
      addMessage("Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.", true);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleDeviceCommand = async (metadata) => {
    if (metadata.needsDeviceControl && metadata.deviceId && metadata.action) {
      const deviceName = metadata.deviceName || metadata.deviceId;
      const actionText = metadata.action === 'turn_on' ? 'bật' : 
                        metadata.action === 'turn_off' ? 'tắt' : 
                        metadata.action;
      
      Alert.alert(
        '🔧 Xác Nhận Điều Khiển Thiết Bị',
        `Bạn có muốn ${actionText} "${deviceName}"?`,
        [
          { text: 'Hủy', style: 'cancel' },
          { 
            text: 'Thực hiện', 
            onPress: async () => {
              try {
                addMessage(`⏳ Đang ${actionText} ${deviceName}...`, true, 'status');
                
                console.log('🔧 Executing device command:', metadata);
                const result = await controlDevice(
                  metadata.deviceId, 
                  metadata.command || metadata.action, 
                  metadata.value
                );
                
                if (result && result.success) {
                  addMessage(
                    `✅ Đã ${actionText} ${deviceName} thành công!`, 
                    true, 
                    'success'
                  );
                } else {
                  throw new Error(result?.error || 'Lệnh thất bại');
                }
                
              } catch (error) {
                console.error('❌ Device control error:', error);
                addMessage(
                  `❌ Không thể ${actionText} ${deviceName}. Lỗi: ${error.message}`, 
                  true, 
                  'error'
                );
              }
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

  const speakMessage = async (text) => {
    try {
      Speech.speak(text, {
        language: 'vi-VN',
        pitch: 1.0,
        rate: 0.8,
      });
      console.log('🔊 Speaking message with expo-speech');
    } catch (error) {
      console.error('Speech synthesis failed:', error);
    }
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
            const currentUserId = getCurrentUserId(user);
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

  const renderMessage = ({ item }) => {
    const parseThinkContent = (text) => {
      const thinkRegex = /<think>(.*?)<\/think>/s;
      const match = text.match(thinkRegex);
      if (match) {
        return {
          hasThink: true,
          thinkContent: match[1].trim(),
          mainContent: text.replace(thinkRegex, '').trim()
        };
      }
      return {
        hasThink: false,
        thinkContent: '',
        mainContent: text
      };
    };

    if (item.type === 'typing') {
      return (
        <View
          style={{
            flexDirection: 'row',
            marginVertical: 4,
            marginHorizontal: 8,
            alignItems: 'flex-end',
          }}
        >
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: GARDEN_THEME.accent.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
            marginBottom: 12,
            ...GARDEN_THEME.glassMorphism,
            borderColor: 'rgba(139, 195, 74, 0.4)',
          }}>
            <Ionicons name="leaf" size={16} color={GARDEN_THEME.text.primary} />
          </View>
          
          <View style={{ 
            alignItems: 'flex-start',
            maxWidth: '80%',
          }}>
            <View
              style={{
                padding: 12,
                borderRadius: 18,
                ...GARDEN_THEME.glassMorphism,
                backgroundColor: GARDEN_THEME.messageBubble.bot,
                borderBottomLeftRadius: 6,
                borderBottomRightRadius: 18,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ 
                  color: GARDEN_THEME.text.primary, 
                  fontSize: 12,
                  marginRight: 8,
                  fontStyle: 'italic'
                }}>
                  Đang suy nghĩ
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Animated.View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: GARDEN_THEME.accent.primary,
                    marginHorizontal: 1,
                    opacity: dot1Opacity,
                  }} />
                  <Animated.View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: GARDEN_THEME.accent.primary,
                    marginHorizontal: 1,
                    opacity: dot2Opacity,
                  }} />
                  <Animated.View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: GARDEN_THEME.accent.primary,
                    marginHorizontal: 1,
                    opacity: dot3Opacity,
                  }} />
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    }

    const parsed = item.isBot ? parseThinkContent(item.text) : { hasThink: false, mainContent: item.text };

    return (
      <View
        style={{
          flexDirection: 'row',
          marginVertical: 2,
          marginHorizontal: 8,
          alignItems: 'flex-end',
        }}
      >
        {item.isBot && (
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: GARDEN_THEME.accent.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
            marginBottom: 12,
            ...GARDEN_THEME.glassMorphism,
            borderColor: 'rgba(139, 195, 74, 0.4)',
          }}>
            <Ionicons name="leaf" size={16} color={GARDEN_THEME.text.primary} />
          </View>
        )}
        
        {!item.isBot && <View style={{ flex: 1 }} />}
        
        <View style={{ 
          flex: item.isBot ? 1 : 0,
          alignItems: item.isBot ? 'flex-start' : 'flex-end',
          maxWidth: '80%',
        }}>
          {parsed.hasThink && (
            <ThinkSection 
              content={parsed.thinkContent} 
              theme={theme}
            />
          )}

          <View
            style={{
              padding: 12,
              borderRadius: 18,
              backgroundColor: item.isBot 
                ? GARDEN_THEME.messageBubble.bot
                : GARDEN_THEME.messageBubble.user,
              borderBottomLeftRadius: item.isBot ? 6 : 18,
              borderBottomRightRadius: item.isBot ? 18 : 6,
              borderWidth: 1,
              borderColor: item.isBot 
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(139, 195, 74, 0.4)',
            }}
          >
            <Text style={{
              color: GARDEN_THEME.text.primary,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: '400',
            }}>
              {parsed.mainContent}
            </Text>
            
            {item.isBot && (
              <TouchableOpacity 
                onPress={() => speakMessage(parsed.mainContent)}
                style={{ 
                  alignSelf: 'flex-end', 
                  marginTop: 6,
                  padding: 4,
                  borderRadius: 8,
                  backgroundColor: GARDEN_THEME.accent.primary + '20',
                }}
              >
                <Ionicons
                  name="volume-medium"
                  size={14}
                  color={GARDEN_THEME.accent.primary}
                />
              </TouchableOpacity>
            )}
          </View>
          
          <Text
            style={{
              fontSize: 10,
              color: GARDEN_THEME.text.tertiary,
              marginTop: 4,
              marginHorizontal: 6,
              alignSelf: item.isBot ? 'flex-start' : 'flex-end',
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
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end' 
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{
            height: '75%',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            marginBottom: 0,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={GARDEN_THEME.gradient}
            style={{
              flex: 1,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12, // Reduced from 16
            ...GARDEN_THEME.glassMorphism,
            marginHorizontal: 16,
            marginTop: 8,
            marginBottom: 12, // Reduced margin
          }}
        >
          <View style={{ 
            position: 'absolute',
            top: -10, // Reduced from -12
            left: '50%',
            marginLeft: -16, // Reduced from -20
            width: 32, // Reduced from 40
            height: 3, // Reduced from 4
            backgroundColor: GARDEN_THEME.text.tertiary,
            borderRadius: 2,
          }} />
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={{
              width: 36, // Reduced from 40
              height: 36, // Reduced from 40
              borderRadius: 18, // Reduced from 20
              backgroundColor: GARDEN_THEME.accent.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10, // Reduced from 12
              ...GARDEN_THEME.glassMorphism,
              borderColor: 'rgba(139, 195, 74, 0.4)',
            }}>
              <Ionicons name="leaf" size={18} color={GARDEN_THEME.text.primary} />
            </View>
            <View>
              <Text style={{ 
                fontSize: 15, // Reduced from 16
                fontWeight: 'bold', 
                color: GARDEN_THEME.text.primary,
                marginBottom: 1, // Reduced from 2
              }}>
                🌱 LyLy Agent
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 5, // Reduced from 6
                  height: 5, // Reduced from 6
                  borderRadius: 2.5,
                  backgroundColor: connectionStatus === 'online' ? GARDEN_THEME.accent.success : GARDEN_THEME.accent.warning,
                  marginRight: 5, // Reduced from 6
                }} />
                <Text style={{ 
                  fontSize: 10, // Reduced from 11
                  color: GARDEN_THEME.text.secondary,
                  fontWeight: '500',
                }}>
                  {isTyping ? 'Đang gõ...' : connectionStatus === 'online' ? 'Sẵn sàng giúp đỡ bạn' : 'Đang kết nối...'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', marginTop: 2 }}>
            <TouchableOpacity
              onPress={clearChat}
              style={{
                width: 32, // Reduced from 36
                height: 32, // Reduced from 36
                borderRadius: 16, // Reduced from 18
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 6, // Reduced from 8
              }}
            >
              <Ionicons name="trash-outline" size={14} color={GARDEN_THEME.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32, // Reduced from 36
                height: 32, // Reduced from 36
                borderRadius: 16, // Reduced from 18
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={14} color={GARDEN_THEME.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={{ flex: 1, paddingHorizontal: 4 }}
          contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              paddingHorizontal: 14, // Reduced from 16
              paddingVertical: 8, // Reduced from 10
              paddingBottom: Platform.OS === 'ios' ? 8 : 10, // Reduced
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              borderWidth: 1,
              marginHorizontal: 12,
              marginBottom: 10, // Reduced from 12
              borderRadius: 18, // Reduced from 20
            }}
          >
            <TextInput
              style={{
                flex: 1,
                borderWidth: 0,
                borderRadius: 14, // Reduced from 16
                paddingHorizontal: 10, // Reduced from 12
                paddingVertical: 6, // Reduced from 8
                marginRight: 6, // Reduced from 8
                backgroundColor: 'transparent',
                color: GARDEN_THEME.text.primary,
                fontSize: 13, // Reduced from 14
                maxHeight: 70, // Reduced from 80
                minHeight: 32, // Reduced from 36
                textAlignVertical: 'center',
              }}
              placeholder="Hãy hỏi tôi về thiết bị, thời tiết..."
              placeholderTextColor={GARDEN_THEME.text.placeholder}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            
            <View style={{ marginRight: 3 }}>
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
                width: 32, // Reduced from 36
                height: 32, // Reduced from 36
                borderRadius: 16, // Reduced from 18
                backgroundColor: !inputText.trim() || isLoading 
                  ? 'rgba(255, 255, 255, 0.2)' 
                  : GARDEN_THEME.accent.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={GARDEN_THEME.text.primary} />
              ) : (
                <Ionicons 
                  name="send" 
                  size={14}
                  color={!inputText.trim() ? GARDEN_THEME.text.tertiary : GARDEN_THEME.text.primary} 
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
            </SafeAreaView>
          </LinearGradient>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default EasyChatBot;
