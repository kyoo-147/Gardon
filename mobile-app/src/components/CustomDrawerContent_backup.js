import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from '@react-navigation/drawer';
import {
  Avatar,
  Title,
  Caption,
  Paragraph,
  Drawer,
  Text,
  TouchableRipple,
  Switch,
  Surface,
  Divider,
  useTheme,
  Button,
  Portal,
  Modal,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useMqtt } from '../context/MqttContext';
import { useChatBot } from '../context/ChatBotContext';
import ChatBotSettings from './ChatBotSettings';

const CustomDrawerContent = (props) => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { currentConfig, mqttStatus, disconnect } = useMqtt();
  const { isEnabled, toggleChatBot, enableChatBot, disableChatBot } = useChatBot();
  const [showChatBotSettings, setShowChatBotSettings] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleMqttDisconnect = () => {
    Alert.alert(
      'Change MQTT Configuration',
      'This will disconnect from current MQTT broker and return to selection screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            disconnect();
            props.navigation.navigate('MqttSelection');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props}>
        {/* User Info Section */}
        <Surface style={styles.userInfoSection}>
          <View style={styles.userInfo}>
            <Avatar.Text 
              size={50} 
              label={user?.username?.charAt(0)?.toUpperCase() || 'U'}
              style={styles.avatar}
            />
            <View style={styles.userDetails}>
              <Title style={styles.title}>
                {user?.profile?.firstName || user?.username || 'User'}
              </Title>
              <Caption style={styles.caption}>
                {user?.email || 'user@example.com'}
              </Caption>
            </View>
          </View>
        </Surface>

        <Divider style={styles.divider} />

        {/* MQTT Status Section */}
        {currentConfig && (
          <>
            <Surface style={styles.mqttSection}>
              <Text style={styles.mqttTitle}>MQTT Connection</Text>
              <View style={styles.statusRow}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: mqttStatus === 'connected' ? '#4CAF50' : '#F44336' }
                ]} />
                <Text style={styles.statusText}>
                  {mqttStatus === 'connected' ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
              <Text style={styles.mqttConfig}>
                {currentConfig.host}:{currentConfig.port}
              </Text>
              <Button
                mode="outlined"
                compact
                onPress={handleMqttDisconnect}
                style={styles.disconnectButton}
                icon="swap-horizontal"
              >
                Change MQTT
              </Button>
            </Surface>
            <Divider style={styles.divider} />
          </>
        )}

        {/* Navigation Items */}
        <Drawer.Section title="Navigation">
          <DrawerItemList {...props} />
        </Drawer.Section>

        <Divider style={styles.divider} />

        {/* ChatBot Controls */}
        <Drawer.Section title="AI Assistant">
          <View style={styles.chatbotSection}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.primary} />
                <Text style={styles.settingLabel}>ChatBot Assistant</Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={isEnabled ? disableChatBot : enableChatBot}
                color={theme.colors.primary}
              />
            </View>
            {isEnabled && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  mode="contained"
                  compact
                  onPress={toggleChatBot}
                  style={[styles.chatbotButton, { flex: 1 }]}
                  icon="color-filter-outline"
                >
                  Open Chat
                </Button>
                <Button
                  mode="outlined"
                  compact
                  onPress={() => setShowChatBotSettings(true)}
                  style={[styles.chatbotButton, { flex: 1 }]}
                  icon="cog"
                >
                  Settings
                </Button>
              </View>
            )}
          </View>
        </Drawer.Section>

      </DrawerContentScrollView>

      {/* Bottom Section */}
      <Drawer.Section style={styles.bottomDrawerSection}>
        <DrawerItem
          icon={({ color, size }) => (
            <Ionicons name="log-out-outline" color={color} size={size} />
          )}
          label="Logout"
          onPress={handleLogout}
        />
      </Drawer.Section>

      {/* ChatBot Settings Modal */}
      <Portal>
        <Modal
          visible={showChatBotSettings}
          onDismiss={() => setShowChatBotSettings(false)}
          contentContainerStyle={{ flex: 1 }}
        >
          <ChatBotSettings onClose={() => setShowChatBotSettings(false)} />
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    elevation: 0,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 15,
  },
  userDetails: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginTop: 3,
    fontWeight: 'bold',
  },
  caption: {
    fontSize: 14,
    lineHeight: 14,
  },
  divider: {
    marginVertical: 10,
  },
  mqttSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 0,
  },
  mqttStatus: {
    marginBottom: 10,
  },
  mqttInfo: {
    marginBottom: 8,
  },
  mqttTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mqttConfig: {
    fontSize: 12,
  },
  disconnectButton: {
    marginTop: 5,
  },
  bottomDrawerSection: {
    marginBottom: 15,
    borderTopColor: '#f4f4f4',
    borderTopWidth: 1,
  },
  chatbotSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  chatbotButton: {
    marginTop: 8,
  },
});

export default CustomDrawerContent;
