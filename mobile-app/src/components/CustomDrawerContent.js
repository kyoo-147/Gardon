import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Alert, StatusBar, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import AuthContext from '../context/AuthContext';
import { useMqtt } from '../context/MqttContext';
import { useChatBot } from '../context/ChatBotContext';
import ChatBotSettings from './ChatBotSettings';
import { API_BASE_URL } from '../constants';

const { width, height } = Dimensions.get('window');

const CustomDrawerContent = (props) => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { token } = useContext(AuthContext);
  const { currentConfig, mqttStatus, disconnect } = useMqtt();
  const { isEnabled, toggleChatBot, enableChatBot, disableChatBot } = useChatBot();
  const [showChatBotSettings, setShowChatBotSettings] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Fetch pending MQTT requests and unread messages
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        if (!token) return;

        // Fetch pending MQTT requests
        const requestsResponse = await fetch(`${API_BASE_URL}/mqtt-requests/pending`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json();
          setPendingRequests(requestsData.requests || []);
        }

        // Fetch unread messages count
        const messagesResponse = await fetch(`${API_BASE_URL}/messages/unread-count`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          setUnreadMessages(messagesData.unreadCount || 0);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#767E67', '#4C533E', '#3C3C40', '#3C3C40']}
        style={styles.gradient}
      >
        {/* Header Section with Garden Theme */}
        <View style={styles.header}>
          <View style={styles.gardenHeader}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#8BC34A', '#689F38']}
                style={styles.logoGradient}
              >
                <Ionicons name="leaf" size={20} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.gardenTitle}>Gardon Control</Text>
              <Text style={styles.gardenSubtitle}>Smart Garden Management</Text>
            </View>
          </View>
        </View>

        <DrawerContentScrollView 
          {...props} 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Profile Section - Redesigned */}
          <View style={styles.userSection}>
            <View style={styles.profileCard}>
              <View style={styles.avatarContainer}>
                <Avatar.Text 
                  size={50} 
                  label={user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  style={styles.avatar}
                  color="#FFFFFF"
                />
                <View style={styles.statusIndicator} />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {user?.profile?.firstName || user?.username || 'Garden Owner'}
                </Text>
                <Text style={styles.userRole}>Administrator</Text>
                <Text style={styles.userEmail}>
                  {user?.email || 'user@gardon.com'}
                </Text>
              </View>
            </View>
          </View>

          {/* MQTT Connection Status - Enhanced */}
          {currentConfig && (
            <View style={styles.mqttSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="wifi" size={16} color="#8BC34A" />
                </View>
                <Text style={styles.sectionTitle}>Network Status</Text>
              </View>
              
              <View style={styles.connectionCard}>
                <View style={styles.connectionHeader}>
                  <View style={styles.connectionInfo}>
                    <View style={styles.statusBadge}>
                      <View style={[
                        styles.statusDot, 
                        { backgroundColor: mqttStatus === 'connected' ? '#8BC34A' : '#FF6B6B' }
                      ]} />
                      <Text style={styles.statusText}>
                        {mqttStatus === 'connected' ? 'Đã kết nối' : 'Chưa kết nối'}
                      </Text>
                    </View>
                    <Text style={styles.configName}>{currentConfig.name}</Text>
                    <Text style={styles.configDetails}>
                      {currentConfig.host}:{currentConfig.port}
                    </Text>
                  </View>
                  <TouchableRipple
                    style={styles.configButton}
                    onPress={handleMqttDisconnect}
                    borderless
                  >
                    <View style={styles.configButtonContent}>
                      <Ionicons name="settings-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
                    </View>
                  </TouchableRipple>
                </View>
              </View>
            </View>
          )}

          {/* Notifications Section */}
          {(pendingRequests.length > 0 || unreadMessages > 0) && (
            <View style={styles.notificationSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="notifications" size={16} color="#FF9800" />
                </View>
                <Text style={styles.sectionTitle}>Notifications</Text>
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>
                    {pendingRequests.length + unreadMessages}
                  </Text>
                </View>
              </View>
              
              {/* MQTT Join Requests */}
              {pendingRequests.length > 0 && (
                <TouchableRipple
                  style={styles.notificationItem}
                  onPress={() => props.navigation.navigate('MqttRequests')}
                  borderless
                >
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationIcon}>
                      <Ionicons name="person-add-outline" size={16} color="#8BC34A" />
                    </View>
                    <View style={styles.notificationText}>
                      <Text style={styles.notificationTitle}>
                        MQTT Join Requests
                      </Text>
                      <Text style={styles.notificationDescription}>
                        {pendingRequests.length} user{pendingRequests.length > 1 ? 's' : ''} want to join your MQTT
                      </Text>
                    </View>
                    <View style={styles.notificationArrow}>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.5)" />
                    </View>
                  </View>
                </TouchableRipple>
              )}

              {/* Unread Messages */}
              {unreadMessages > 0 && (
                <TouchableRipple
                  style={styles.notificationItem}
                  onPress={() => props.navigation.navigate('Chat')}
                  borderless
                >
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationIcon}>
                      <Ionicons name="chatbubble" size={16} color="#2196F3" />
                    </View>
                    <View style={styles.notificationText}>
                      <Text style={styles.notificationTitle}>
                        New Messages
                      </Text>
                      <Text style={styles.notificationDescription}>
                        {unreadMessages} unread message{unreadMessages > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.notificationArrow}>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.5)" />
                    </View>
                  </View>
                </TouchableRipple>
              )}
            </View>
          )}

          {/* Navigation Menu - Cleaner Design */}
          <View style={styles.navigationSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="apps" size={16} color="#8BC34A" />
              </View>
              <Text style={styles.sectionTitle}>Navigation</Text>
            </View>
            <View style={styles.navigationContent}>
              <DrawerItemList {...props} />
            </View>
          </View>

          {/* AI Assistant - Modern Card Design */}
          <View style={styles.chatbotSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="sparkles" size={16} color="#8BC34A" />
              </View>
              <Text style={styles.sectionTitle}>AI Assistant</Text>
            </View>
            
            <View style={styles.aiCard}>
              <View style={styles.aiToggle}>
                <View style={styles.aiInfo}>
                  <Text style={styles.aiTitle}>Smart Assistant</Text>
                  <Text style={styles.aiDescription}>
                    {isEnabled ? 'Active and ready to help' : 'Tap to enable AI features'}
                  </Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={isEnabled ? disableChatBot : enableChatBot}
                  thumbColor={isEnabled ? "#8BC34A" : "#FFFFFF"}
                  trackColor={{ false: "rgba(255, 255, 255, 0.3)", true: "rgba(139, 195, 74, 0.5)" }}
                />
              </View>
              
              {isEnabled && (
                <View style={styles.aiActions}>
                  <TouchableRipple
                    style={styles.aiActionButton}
                    onPress={toggleChatBot}
                    borderless
                  >
                    <LinearGradient
                      colors={['#8BC34A', '#689F38']}
                      style={styles.actionGradient}
                    >
                      <Ionicons name="chatbubble-ellipses" size={16} color="#FFFFFF" />
                      <Text style={styles.actionText}>Open Chat</Text>
                    </LinearGradient>
                  </TouchableRipple>
                  
                  <TouchableRipple
                    style={styles.aiSettingsButton}
                    onPress={() => setShowChatBotSettings(true)}
                    borderless
                  >
                    <View style={styles.settingsContent}>
                      <Ionicons name="cog-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
                    </View>
                  </TouchableRipple>
                </View>
              )}
            </View>
          </View>

        </DrawerContentScrollView>

        {/* Bottom Action Section */}
        <View style={styles.bottomSection}>
          <View style={styles.quickActions}>
            <TouchableRipple
              style={styles.quickActionButton}
              onPress={() => props.navigation.navigate('Profile')}
              borderless
            >
              <View style={styles.quickActionContent}>
                <Ionicons name="person-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.quickActionText}>Profile</Text>
              </View>
            </TouchableRipple>
            
            <TouchableRipple
              style={styles.quickActionButton}
              onPress={() => props.navigation.navigate('Settings')}
              borderless
            >
              <View style={styles.quickActionContent}>
                <Ionicons name="settings-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.quickActionText}>Settings</Text>
              </View>
            </TouchableRipple>
          </View>
          
          <TouchableRipple
            style={styles.logoutButton}
            onPress={handleLogout}
            borderless
          >
            <LinearGradient
              colors={['#F44336', '#D32F2F']}
              style={styles.logoutGradient}
            >
              <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </LinearGradient>
          </TouchableRipple>
        </View>
      </LinearGradient>

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
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  gardenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    marginRight: 12,
  },
  logoGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  gardenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  gardenSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  userSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    backgroundColor: '#8BC34A',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8BC34A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#8BC34A',
    marginBottom: 2,
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  mqttSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  notificationSection: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#404040',
  },
  notificationBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto',
    minWidth: 20,
    alignItems: 'center',
  },
  notificationCount: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  notificationItem: {
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#383838',
  },
  notificationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  notificationArrow: {
    marginLeft: 8,
  },
  navigationSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  chatbotSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // MQTT Connection Styles
  connectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectionInfo: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  configName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  configDetails: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  configButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  configButtonContent: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Navigation Styles
  navigationContent: {
    marginHorizontal: -8,
  },
  
  // AI Assistant Styles
  aiCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  aiToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiInfo: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  aiDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  aiActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiActionButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  aiSettingsButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  settingsContent: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#383838',
  },
  // Bottom Section Styles
  bottomSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  logoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default CustomDrawerContent;
