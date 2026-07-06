import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Text,
  Card,
  Button,
  useTheme,
  Avatar,
  Divider,
  List,
  Switch,
  Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useMqtt } from '../../context/MqttContext';
import { COLORS } from '../../constants';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { mqttStatus, currentConfig } = useMqtt();
  
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [notifications, setNotifications] = useState(
    user?.settings?.notifications ?? true
  );

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              setSnackbarMessage('Error during logout');
              setShowSnackbar(true);
            }
          },
        },
      ]
    );
  };

  const handleNotificationToggle = (value) => {
    setNotifications(value);
    // Here you would typically update the user settings
    setSnackbarMessage(
      value ? 'Notifications enabled' : 'Notifications disabled'
    );
    setShowSnackbar(true);
  };

  const getInitials = () => {
    const firstName = user?.profile?.firstName || '';
    const lastName = user?.profile?.lastName || '';
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    }
    return user?.username?.[0]?.toUpperCase() || 'U';
  };

  const getStatusColor = () => {
    switch (mqttStatus) {
      case 'connected':
        return '#4CAF50';
      case 'connecting':
        return '#FF9800';
      case 'error':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Modern Gradient Background */}
      <LinearGradient
        colors={[
          '#767E67', // Light gray-green
          '#4C533E', // Medium gray-green
          '#3C3C40', // Medium gray
          '#3C3C40'  // Darker gray
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Modern Header */}
          <View style={styles.modernHeader}>
            <View style={styles.headerContent}>
              <TouchableOpacity 
                style={styles.menuButton}
                onPress={() => navigation.openDrawer?.() || navigation.getParent()?.openDrawer?.()}
              >
                <View style={styles.menuButtonBackground}>
                  <Ionicons name="menu" size={24} color="rgba(255, 255, 255, 0.9)" />
                </View>
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Hồ sơ & Cài đặt</Text>
                <Text style={styles.headerSubtitle}>
                  Manage your garden account
                </Text>
              </View>

              <TouchableOpacity style={styles.profileIcon}>
                <View style={styles.profileIconBackground}>
                  <Ionicons name="settings-outline" size={20} color="rgba(255, 255, 255, 0.9)" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Header */}
            <View style={styles.profileCard}>
              <View style={styles.profileContent}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={['rgba(139, 195, 74, 0.8)', 'rgba(104, 159, 56, 0.8)']}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>{getInitials()}</Text>
                  </LinearGradient>
                </View>
                
                <View style={styles.profileInfo}>
                  <Text style={styles.userName}>
                    {user?.profile?.firstName && user?.profile?.lastName
                      ? `${user.profile.firstName} ${user.profile.lastName}`
                      : user?.username || 'User'
                    }
                  </Text>
                  <Text style={styles.userEmail}>{user?.email}</Text>
                  <Text style={styles.userSince}>
                    Member since {new Date(user?.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* MQTT Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Garden Network Status</Text>
              
              <View style={styles.statusRow}>
                <View style={styles.statusIconContainer}>
                  <Ionicons
                    name="leaf"
                    size={24}
                    color={getStatusColor()}
                  />
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusLabel}>Garden Network</Text>
                  <Text style={[styles.statusValue, { color: getStatusColor() }]}>
                    {mqttStatus.toUpperCase()}
                  </Text>
                  {currentConfig && (
                    <Text style={styles.statusDetail}>
                      {currentConfig.name} ({currentConfig.host})
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Settings</Text>
              
              <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
                <View style={styles.listItemLeft}>
                  <View style={styles.listItemIcon}>
                    <Ionicons name="notifications" size={20} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  <View style={styles.listItemText}>
                    <Text style={styles.listItemTitle}>Notifications</Text>
                    <Text style={styles.listItemDescription}>Receive device alerts and updates</Text>
                  </View>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#8BC34A' }}
                  thumbColor={notifications ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)'}
                />
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <TouchableOpacity 
                style={styles.listItem} 
                activeOpacity={0.7}
                onPress={() => {
                  setSnackbarMessage('Theme settings coming soon');
                  setShowSnackbar(true);
                }}
              >
                <View style={styles.listItemLeft}>
                  <View style={styles.listItemIcon}>
                    <Ionicons name="color-palette" size={20} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  <View style={styles.listItemText}>
                    <Text style={styles.listItemTitle}>Theme</Text>
                    <Text style={styles.listItemDescription}>Dark theme</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <TouchableOpacity 
                style={styles.listItem} 
                activeOpacity={0.7}
                onPress={() => {
                  setSnackbarMessage('Language settings coming soon');
                  setShowSnackbar(true);
                }}
              >
                <View style={styles.listItemLeft}>
                  <View style={styles.listItemIcon}>
                    <Ionicons name="language" size={20} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  <View style={styles.listItemText}>
                    <Text style={styles.listItemTitle}>Language</Text>
                    <Text style={styles.listItemDescription}>English</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
            </View>

            {/* Account */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
              
              <TouchableOpacity 
                style={styles.listItem} 
                activeOpacity={0.7}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <View style={styles.listItemLeft}>
                  <View style={styles.listItemIcon}>
                    <Ionicons name="person-circle" size={20} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  <View style={styles.listItemText}>
                    <Text style={styles.listItemTitle}>Chỉnh sửa hồ sơ</Text>
                    <Text style={styles.listItemDescription}>Cập nhật thông tin cá nhân của bạn</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <TouchableOpacity 
                style={styles.listItem} 
                activeOpacity={0.7}
                onPress={() => {
                  setSnackbarMessage('Tính năng thay đổi mật khẩu sẽ có sớm');
                  setShowSnackbar(true);
                }}
              >
                <View style={styles.listItemLeft}>
                  <View style={styles.listItemIcon}>
                    <Ionicons name="lock-closed" size={20} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  <View style={styles.listItemText}>
                    <Text style={styles.listItemTitle}>Thay đổi mật khẩu</Text>
                    <Text style={styles.listItemDescription}>Update your account password</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <TouchableOpacity 
                style={styles.listItem} 
                activeOpacity={0.7}
                onPress={() => {
                  setSnackbarMessage('Privacy settings coming soon');
                  setShowSnackbar(true);
                }}
              >
                <View style={styles.listItemLeft}>
                  <View style={styles.listItemIcon}>
                    <Ionicons name="shield-checkmark" size={20} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  <View style={styles.listItemText}>
                    <Text style={styles.listItemTitle}>Privacy</Text>
                    <Text style={styles.listItemDescription}>Manage your data and privacy</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
            </View>

            {/* App Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              
              <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
                <View style={styles.listItemLeft}>
                  <View style={styles.listItemIcon}>
                    <Ionicons name="information-circle" size={20} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  <View style={styles.listItemText}>
                    <Text style={styles.listItemTitle}>App Version</Text>
                    <Text style={styles.listItemDescription}>1.0.0</Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <TouchableOpacity 
                style={styles.listItem} 
                activeOpacity={0.7}
                onPress={() => {
                  setSnackbarMessage('Help center coming soon');
                  setShowSnackbar(true);
                }}
              >
                <View style={styles.listItemLeft}>
                  <View style={styles.listItemIcon}>
                    <Ionicons name="help-circle" size={20} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  <View style={styles.listItemText}>
                    <Text style={styles.listItemTitle}>Help & Support</Text>
                    <Text style={styles.listItemDescription}>Get help or contact support</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(255, 107, 107, 0.8)', 'rgba(244, 67, 54, 0.8)']}
                style={styles.logoutButtonGradient}
              >
                <Ionicons name="log-out" size={20} color="#FFFFFF" />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Snackbar */}
      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  modernHeader: {
    paddingHorizontal: 16, // Giảm từ 20  
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    marginRight: 12,
  },
  menuButtonBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 2,
  },
  profileIcon: {
    marginLeft: 12,
  },
  profileIconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Tăng padding để tránh TabBar
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  userSince: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusDetail: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listItemText: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  listItemDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 8,
  },
  logoutButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  logoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  snackbar: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
});

export default ProfileScreen;
