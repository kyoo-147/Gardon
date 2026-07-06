import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
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
  Chip,
  IconButton,
  Surface,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMqtt } from '../../context/MqttContext';
import AuthContext from '../../context/AuthContext';
import { formatTimestamp } from '../../utils';
import { COLORS } from '../../constants';
import ModernCard from '../../components/ModernCard';

const { width } = Dimensions.get('window');

const MqttConfigScreen = ({ navigation }) => {
  const theme = useTheme();
  const { logout } = useContext(AuthContext);
  const {
    configs,
    currentConfig,
    mqttStatus,
    loadConfigs,
    deleteConfig,
    connectToMqtt,
    isLoading,
    error,
    clearError,
  } = useMqtt();

  const [refreshing, setRefreshing] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    if (error) {
      setSnackbarMessage(error);
      setShowSnackbar(true);
      clearError();
    }
  }, [error]);

  // Show success message when MQTT connection is successful  
  useEffect(() => {
    if (mqttStatus === 'connected' && currentConfig) {
      setSnackbarMessage(`✅ Đã kết nối với ${currentConfig.name} - Sẵn sàng truy cập bảng điều khiển!`);
      setShowSnackbar(true);
      // Removed auto-navigation - user can now choose when to go to dashboard
    }
  }, [mqttStatus, currentConfig]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConfigs();
    setRefreshing(false);
  };

  const handleAddConfig = () => {
    navigation.navigate('AddMqttConfig');
  };

  const handleEditConfig = (config) => {
    navigation.navigate('EditMqttConfig', { config });
  };

  const handleDeleteConfig = (config) => {
    Alert.alert(
      'Xóa cấu hình',
      `Bạn có chắc chắn muốn xóa "${config.name}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConfig(config._id);
              setSnackbarMessage('Đã xóa cấu hình thành công');
              setShowSnackbar(true);
            } catch (error) {
              setSnackbarMessage('Không thể xóa cấu hình');
              setShowSnackbar(true);
            }
          },
        },
      ]
    );
  };

  const handleConnect = (config) => {
    connectToMqtt(config);
    setSnackbarMessage(`Đang kết nối đến ${config.name}...`);
    setShowSnackbar(true);
  };

  const handleGoToDashboard = () => {
    navigation.navigate('MainApp');
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất? Bạn sẽ cần đăng nhập lại để truy cập tài khoản của mình.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // No need to navigate, App.js will handle the navigation automatically
            } catch (error) {
              setSnackbarMessage('Lỗi khi đăng xuất');
              setShowSnackbar(true);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (config) => {
    if (currentConfig?._id === config._id) {
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
    }
    return '#9E9E9E';
  };

  const getStatusText = (config) => {
    if (currentConfig?._id === config._id) {
      switch (mqttStatus) {
        case 'connected':
          return 'Đã kết nối';
        case 'connecting':
          return 'Đang kết nối...';
        case 'error':
          return 'Lỗi';
        default:
          return 'Chưa kết nối';
      }
    }
    return 'Chưa kết nối';
  };

  const renderConfigCard = (config) => (
    <TouchableOpacity 
      key={config._id} 
      style={styles.configCard}
      activeOpacity={0.8}
      onPress={() => handleConnect(config)}
    >
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
        style={styles.configCardGradient}
      >
        <View style={styles.configHeader}>
          <View style={styles.configIconContainer}>
            <Ionicons 
              name="server" 
              size={24} 
              color={currentConfig?._id === config._id ? '#8BC34A' : 'rgba(255, 255, 255, 0.7)'} 
            />
          </View>
          
          <View style={[
            styles.configStatus,
            { backgroundColor: getStatusColor(config) }
          ]} />
        </View>

        <Text style={styles.configName} numberOfLines={1}>
          {config.name}
        </Text>
        
        <Text style={styles.configDetails}>
          🌐 {config.host}:{config.port}
        </Text>
        
        {config.username && (
          <Text style={styles.configUsername}>
            👤 {config.username}
          </Text>
        )}

        <View style={styles.configMeta}>
          <Text style={styles.configMetaText}>
            📡 {config.protocolId} v{config.protocolVersion}
          </Text>
          <Text style={styles.configMetaText}>
            🔧 {config.clientId}
          </Text>
        </View>

        <View style={styles.configActions}>
          {currentConfig?._id === config._id && mqttStatus === 'connected' ? (
            <TouchableOpacity
              onPress={handleGoToDashboard}
              style={styles.primaryButton}
            >
              <LinearGradient
                colors={['#8BC34A', '#689F38']}
                style={styles.buttonGradient}
              >
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Vào vườn</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => handleConnect(config)}
              disabled={isLoading || (currentConfig?._id === config._id && mqttStatus === 'connecting')}
              style={[styles.primaryButton, { opacity: isLoading ? 0.6 : 1 }]}
            >
              <LinearGradient
                colors={['#8BC34A', '#689F38']}
                style={styles.buttonGradient}
              >
                {currentConfig?._id === config._id && mqttStatus === 'connecting' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="wifi" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Kết nối</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditConfig(config)}
            >
              <Ionicons name="pencil" size={16} color="rgba(255, 255, 255, 0.8)" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteConfig(config)}
            >
              <Ionicons name="trash" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>

        {config.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>🌟 Mặc định</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

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
                <Text style={styles.headerTitle}>🌿 Gardon Network</Text>
                <Text style={styles.headerSubtitle}>
                  Quản lý ngôi nhà thông minh của bạn
                </Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.logoutButton}
                  onPress={handleLogout}
                  activeOpacity={0.8}
                >
                  <View style={styles.logoutButtonBackground}>
                    <Ionicons name="log-out-outline" size={20} color="rgba(255, 255, 255, 0.9)" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddConfig}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#8BC34A', '#689F38']}
                    style={styles.addButtonGradient}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="rgba(255, 255, 255, 0.8)"
              />
            }
          >
            {/* Current Connection Status */}
            {currentConfig && (
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <View style={styles.statusIconContainer}>
                    <Ionicons
                      name={mqttStatus === 'connected' ? 'wifi' : 'wifi-outline'}
                      size={24}
                      color={getStatusColor(currentConfig)}
                    />
                  </View>
                  
                  <View style={styles.statusInfo}>
                    <Text style={styles.statusTitle}>Kết nối Gardon hiện tại</Text>
                    <Text style={styles.statusSubtitle}>
                      {currentConfig.name} - {getStatusText(currentConfig)}
                    </Text>
                  </View>
                  
                  {mqttStatus === 'connecting' && (
                    <ActivityIndicator size="small" color="#8BC34A" />
                  )}
                  
                  {mqttStatus === 'connected' && (
                    <TouchableOpacity
                      onPress={handleGoToDashboard}
                      style={styles.statusButton}
                    >
                      <LinearGradient
                        colors={['#8BC34A', '#689F38']}
                        style={styles.statusButtonGradient}
                      >
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                        <Text style={styles.statusButtonText}>Bảng điều khiển</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Configurations List */}
            {isLoading && configs.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.loadingText}>Đang tải cấu hình...</Text>
              </View>
            ) : configs.length > 0 ? (
              <View style={styles.configsList}>
                {configs.map(renderConfigCard)}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <Ionicons name="leaf-outline" size={60} color="rgba(255, 255, 255, 0.4)" />
                  <Text style={styles.emptyTitle}>🌱 Chưa có kết nối nào!</Text>
                  <Text style={styles.emptySubtitle}>
                    Tạo cấu hình mạng đầu tiên của bạn để kết nối các thiết bị thông minh
                  </Text>
                  
                  <TouchableOpacity
                    onPress={handleAddConfig}
                    style={styles.emptyButton}
                  >
                    <LinearGradient
                      colors={['#8BC34A', '#689F38']}
                      style={styles.emptyButtonGradient}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                      <Text style={styles.emptyButtonText}>Thêm kết nối Gardon</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('MqttTest')}
                    style={styles.testButton}
                  >
                    <Ionicons name="flask-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
                    <Text style={styles.testButtonText}>Kiểm tra kết nối</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  addButton: {
    marginLeft: 8,
  },
  addButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    marginLeft: 8,
  },
  logoutButtonBackground: {
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
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusHeader: {
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
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  statusButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  configsList: {
    gap: 16,
  },
  configCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  configCardGradient: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  configIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configStatus: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  configName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  configDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  configUsername: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
  },
  configMeta: {
    marginBottom: 16,
  },
  configMetaText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 2,
  },
  configActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  defaultBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: '#8BC34A',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  testButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  snackbar: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
});

export default MqttConfigScreen;
