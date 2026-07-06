import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import {
  Surface,
  Text,
  Switch,
  Button,
  Divider,
  List,
  IconButton,
  useTheme,
  Chip,
  RadioButton,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChatBot } from '../context/ChatBotContext';

const ChatBotSettings = ({ onClose }) => {
  const theme = useTheme();
  const { isEnabled, enableChatBot, disableChatBot } = useChatBot();
  
  const [settings, setSettings] = useState({
    autoSpeech: false,
    quickActions: true,
    notifications: true,
    autoSend: false,
    theme: 'auto', // auto, light, dark
    responseDelay: 'normal', // fast, normal, slow
    voiceEnabled: true,
    conversationHistory: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('chatbot_user_settings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading chatbot settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('chatbot_user_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving chatbot settings:', error);
    }
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const clearChatHistory = () => {
    Alert.alert(
      'Clear Chat History',
      'Điều này sẽ xóa vĩnh viễn tất cả tin nhắn trò chuyện của bạn. Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('chatbot_messages');
              Alert.alert('Thành công', 'Lịch sử trò chuyện đã được xóa.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear chat history.');
            }
          },
        },
      ]
    );
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Đặt lại cài đặt',
      'Điều này sẽ đặt lại tất cả cài đặt chatbot về giá trị mặc định.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt lại',
          onPress: () => {
            const defaultSettings = {
              autoSpeech: false,
              quickActions: true,
              notifications: true,
              autoSend: false,
              theme: 'auto',
              responseDelay: 'normal',
              voiceEnabled: true,
              conversationHistory: true,
            };
            saveSettings(defaultSettings);
          },
        },
      ]
    );
  };

  return (
    <Surface style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 16,
          backgroundColor: theme.colors.surface,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons 
            name="settings" 
            size={24} 
            color={theme.colors.primary} 
            style={{ marginRight: 12 }}
          />
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
            ChatBot Settings
          </Text>
        </View>
        <IconButton icon="close" onPress={onClose} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Main Toggle */}
        <Surface style={{ margin: 16, padding: 16, borderRadius: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>
                Enable ChatBot Assistant
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.outline, marginTop: 4 }}>
                Turn on/off the AI assistant feature
              </Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={isEnabled ? disableChatBot : enableChatBot}
              color={theme.colors.primary}
            />
          </View>
        </Surface>

        {isEnabled && (
          <>
            {/* Behavior Settings */}
            <Surface style={{ margin: 16, padding: 16, borderRadius: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
                Behavior
              </Text>

              <List.Item
                title="Tự động đọc phản hồi"
                description="Tự động đọc to các phản hồi của bot"
                left={() => <Ionicons name="volume-high" size={24} color={theme.colors.primary} />}
                right={() => (
                  <Switch
                    value={settings.autoSpeech}
                    onValueChange={(value) => updateSetting('autoSpeech', value)}
                    color={theme.colors.primary}
                  />
                )}
              />

              <List.Item
                title="Hiển thị hành động nhanh"
                description="Hiển thị các nút hành động nhanh phía trên chat"
                left={() => <Ionicons name="flash" size={24} color={theme.colors.primary} />}
                right={() => (
                  <Switch
                    value={settings.quickActions}
                    onValueChange={(value) => updateSetting('quickActions', value)}
                    color={theme.colors.primary}
                  />
                )}
              />

              <List.Item
                title="Tự động gửi tin nhắn thoại"
                description="Tự động gửi đầu vào thoại mà không cần xác nhận"
                left={() => <Ionicons name="mic" size={24} color={theme.colors.primary} />}
                right={() => (
                  <Switch
                    value={settings.autoSend}
                    onValueChange={(value) => updateSetting('autoSend', value)}
                    color={theme.colors.primary}
                  />
                )}
              />

              <List.Item
                title="Kích hoạt đầu vào thoại"
                description="Kích hoạt chức năng đầu vào bằng giọng nói"
                left={() => <Ionicons name="mic-circle" size={24} color={theme.colors.primary} />}
                right={() => (
                  <Switch
                    value={settings.voiceEnabled}
                    onValueChange={(value) => updateSetting('voiceEnabled', value)}
                    color={theme.colors.primary}
                  />
                )}
              />
            </Surface>

            {/* Response Settings */}
            <Surface style={{ margin: 16, padding: 16, borderRadius: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
                Response Speed
              </Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['fast', 'normal', 'slow'].map((speed) => (
                  <Chip
                    key={speed}
                    selected={settings.responseDelay === speed}
                    onPress={() => updateSetting('responseDelay', speed)}
                    style={{
                      backgroundColor: settings.responseDelay === speed 
                        ? theme.colors.primary 
                        : theme.colors.surfaceVariant,
                    }}
                    textStyle={{
                      color: settings.responseDelay === speed 
                        ? theme.colors.onPrimary 
                        : theme.colors.onSurfaceVariant,
                    }}
                  >
                    {speed.charAt(0).toUpperCase() + speed.slice(1)}
                  </Chip>
                ))}
              </View>
              
              <Text style={{ fontSize: 12, color: theme.colors.outline, marginTop: 8 }}>
                {settings.responseDelay === 'fast' && 'Responses appear immediately'}
                {settings.responseDelay === 'normal' && 'Natural typing simulation'}
                {settings.responseDelay === 'slow' && 'Slower, more deliberate responses'}
              </Text>
            </Surface>

            {/* Privacy & Data */}
            <Surface style={{ margin: 16, padding: 16, borderRadius: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
                Privacy & Data
              </Text>

              <List.Item
                title="Lưu lịch sử cuộc trò chuyện"
                description="Giữ lại tin nhắn chat cho các phiên sau"
                left={() => <Ionicons name="save" size={24} color={theme.colors.primary} />}
                right={() => (
                  <Switch
                    value={settings.conversationHistory}
                    onValueChange={(value) => updateSetting('conversationHistory', value)}
                    color={theme.colors.primary}
                  />
                )}
              />

              <List.Item
                title="Thông báo đẩy"
                description="Nhận thông báo về các phản hồi quan trọng của chatbot"
                left={() => <Ionicons name="notifications" size={24} color={theme.colors.primary} />}
                right={() => (
                  <Switch
                    value={settings.notifications}
                    onValueChange={(value) => updateSetting('notifications', value)}
                    color={theme.colors.primary}
                  />
                )}
              />
            </Surface>

            {/* Data Management */}
            <Surface style={{ margin: 16, padding: 16, borderRadius: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
                Data Management
              </Text>

              <Button
                mode="outlined"
                onPress={clearChatHistory}
                icon="delete"
                style={{ marginBottom: 12 }}
                textColor={theme.colors.error}
              >
                Clear Chat History
              </Button>

              <Button
                mode="outlined"
                onPress={resetToDefaults}
                icon="refresh"
              >
                Đặt lại mặc định
              </Button>
            </Surface>

            {/* About */}
            <Surface style={{ margin: 16, padding: 16, borderRadius: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
                About ChatBot
              </Text>
              
              <Text style={{ fontSize: 14, color: theme.colors.outline, lineHeight: 20 }}>
                Your IoT Assistant is powered by advanced AI to help you manage your smart devices, 
                troubleshoot issues, and optimize your IoT setup. The assistant processes your queries 
                locally when possible and can connect to cloud services for enhanced capabilities.
              </Text>
              
              <View style={{ flexDirection: 'row', marginTop: 12, flexWrap: 'wrap' }}>
                <Chip icon="shield-check" style={{ marginRight: 8, marginBottom: 8 }}>
                  Privacy First
                </Chip>
                <Chip icon="flash" style={{ marginRight: 8, marginBottom: 8 }}>
                  Real-time
                </Chip>
                <Chip icon="brain" style={{ marginRight: 8, marginBottom: 8 }}>
                  Smart AI
                </Chip>
              </View>
            </Surface>
          </>
        )}
      </ScrollView>
    </Surface>
  );
};

export default ChatBotSettings;
