import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  StatusBar,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useMqtt } from '../../context/MqttContext';
import { COLORS } from '../../constants';
import DeviceWidget from '../../components/DeviceWidget';

const { width, height } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const {
    devices,
    currentConfig,
    mqttStatus,
    loadDevices,
    loadConfigs,
    connectToMqtt,
    disconnectMqtt,
    controlDevice,
    refreshDevice,
    isLoading,
  } = useMqtt();

  const [refreshing, setRefreshing] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadDevices(),
        loadConfigs(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleConnectMqtt = () => {
    if (currentConfig) {
      connectToMqtt(currentConfig);
    } else {
      navigation.navigate('MQTT', { screen: 'AddMqttConfig' });
    }
  };

  const handleDeviceControl = async (deviceId, command, value) => {
    try {
      const result = await controlDevice(deviceId, command, value);
      console.log(`✅ Device control successful: ${deviceId} -> ${command}:${value}`, result);
      return result;
    } catch (error) {
      console.error('❌ Error controlling device:', error);
      throw error;
    }
  };

  const handleControlDevice = async (deviceId, command, value = null) => {
    if (mqttStatus !== 'connected') {
      setSnackbarMessage('MQTT không được kết nối');
      setShowSnackbar(true);
      throw new Error('MQTT không được kết nối');
    }

    try {
      const device = devices.find(d => d._id === deviceId);
      if (!device) {
        setSnackbarMessage('Không tìm thấy thiết bị');
        setShowSnackbar(true);
        throw new Error('Không tìm thấy thiết bị');
      }

      // Use the controlDevice function from useMqtt hook
      const result = await controlDevice(deviceId, command, value);
      
      console.log(`✅ Device control successful: ${device.name} -> ${command}:${value}`, result);

      setSnackbarMessage(`✅ Lệnh đã được gửi đến ${device.name}`);
      setShowSnackbar(true);
      
      return result;
    } catch (error) {
      console.error('❌ Error controlling device:', error);
      const deviceName = devices.find(d => d._id === deviceId)?.name || 'device';
      setSnackbarMessage(`❌ Không thể điều khiển ${deviceName}: ${error.message}`);
      setShowSnackbar(true);
      throw error;
    }
  };
  
  const getStatusIcon = () => {
    switch (mqttStatus) {
      case 'connected':
        return 'wifi';
      case 'connecting':
        return 'refresh';
      case 'error':
        return 'wifi-sharp';
      default:
        return 'wifi';
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  // Modern Device Card Component
  const ModernDeviceCard = ({ device, onControl, onRefresh }) => {
    const isOnline = device.currentState?.online;
    const deviceIcon = getDeviceIcon(device.type);
    
    return (
      <TouchableOpacity style={styles.deviceCard} activeOpacity={0.8}>
        <View style={styles.deviceHeader}>
          <View style={[styles.deviceIconContainer, { backgroundColor: isOnline ? 'rgba(139, 195, 74, 0.2)' : 'rgba(255, 255, 255, 0.1)' }]}>
            <Ionicons 
              name={deviceIcon} 
              size={24} 
              color={isOnline ? '#8BC34A' : 'rgba(255,255,255,0.6)'} 
            />
          </View>
          <View style={[styles.deviceStatus, { backgroundColor: isOnline ? '#8BC34A' : '#FF6B6B' }]} />
        </View>
        
        <Text style={styles.deviceName} numberOfLines={1}>
          {device.name}
        </Text>
        <Text style={styles.deviceLocation} numberOfLines={1}>
          {device.location || 'Garden'}
        </Text>
        
        {device.currentState?.value !== undefined && (
          <Text style={styles.deviceValue}>
            {device.currentState.value}
            {device.unit && ` ${device.unit}`}
          </Text>
        )}
        
        {/* <TouchableOpacity 
          style={[styles.deviceControl, { opacity: isOnline ? 1 : 0.5 }]}
          onPress={() => isOnline && onControl(device._id, 'toggle', !device.currentState?.value)}
          disabled={!isOnline}
        >
          <Ionicons 
            name={device.currentState?.value ? "stop" : "play"} 
            size={16} 
            color="#FFFFFF" 
          />
        </TouchableOpacity> */}
        <View style={styles.deviceControls}>
          <DeviceWidget 
            device={device}
            size="small"
            showTitle={false}
            onControl={handleControlDevice}
            onRefreshDevice={refreshDevice}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const getDeviceIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'light': return 'bulb-outline';
      case 'sensor': return 'thermometer-outline';
      case 'pump': return 'water-outline';
      case 'valve': return 'options-outline';
      case 'fan': return 'refresh-outline';
      default: return 'hardware-chip-outline';
    }
  };

  const onlineDevices = devices.filter(device => device.currentState?.online);
  const totalDevices = devices.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Elegant Gray Gradient Background */}
      <LinearGradient
        colors={[
          '#767E67', // Light gray
          '#4C533E', // Medium light gray
          '#3C3C40', // Medium gray
          '#3C3C40'  // Darker gray
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
        {/* Modern Header with Hamburger Menu */}
        <View style={styles.modernHeader}>
            <View style={styles.headerContent}>
              {/* Hamburger Menu Button */}
              <TouchableOpacity 
                style={styles.menuButton}
                onPress={() => navigation.openDrawer?.() || navigation.getParent()?.openDrawer?.()}
              >
                <View style={styles.menuButtonBackground}>
                  <Ionicons name="menu" size={24} color="rgba(255, 255, 255, 0.9)" />
                </View>
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>🌱 Bảng điều khiển vườn</Text>
                <Text style={styles.headerSubtitle}>
                  Chào mừng quay trở lại, {user?.profile?.firstName || user?.username || 'Garden Owner'}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => navigation.navigate('Devices', { screen: 'AddDevice' })}
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

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#8BC34A"
                colors={['#8BC34A']}
              />
            }
          >
            {/* Modern Status Overview */}
            <View style={styles.statusOverview}>
              <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                  <View style={styles.statusIndicator}>
                    <Ionicons 
                      name={getStatusIcon()} 
                      size={20} 
                      color={mqttStatus === 'connected' ? '#8BC34A' : '#FF6B6B'} 
                    />
                  </View>
                  <View style={styles.statusInfo}>
                    <Text style={styles.statusText}>
                      {mqttStatus === 'connected' ? 'Đã kết nối' : 'Ngắt kết nối'}
                    </Text>
                    <Text style={styles.statusSubtext}>
                      {currentConfig?.name || 'Chưa chọn cấu hình'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.statusAction}
                    onPress={mqttStatus === 'connected' ? disconnectMqtt : handleConnectMqtt}
                  >
                    <Text style={styles.statusActionText}>
                      {mqttStatus === 'connected' ? 'Ngắt kết nối' : 'Kết nối'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Modern Device Grid */}
            <View style={styles.deviceGrid}>
              <View style={styles.gridHeader}>
                <Text style={styles.gridTitle}>Thiết bị thông minh</Text>
                <Text style={styles.gridSubtitle}>
                  {onlineDevices.length} trong số {totalDevices} thiết bị trực tuyến
                </Text>
              </View>
              
              <View style={styles.gridContent}>
                {isLoading ? (
                  <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color="#8BC34A" />
                    <Text style={styles.loadingText}>Đang tải thiết bị...</Text>
                  </View>
                ) : devices.length > 0 ? (
                  devices.slice(0, 6).map((device, index) => (
                    <ModernDeviceCard 
                      key={device._id} 
                      device={device} 
                      onControl={handleDeviceControl}
                      onRefresh={refreshDevice}
                    />
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="leaf-outline" size={48} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.emptyText}>Không tìm thấy thiết bị</Text>
                    <Text style={styles.emptySubtext}>Thêm thiết bị thông minh đầu tiên của bạn để bắt đầu</Text>
                    <TouchableOpacity
                      style={styles.emptyButton}
                      onPress={() => navigation.navigate('Devices', { screen: 'AddDevice' })}
                    >
                      <Text style={styles.emptyButtonText}>Thêm thiết bị</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Statistics */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalDevices}</Text>
                <Text style={styles.statLabel}>Tổng thiết bị</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{onlineDevices.length}</Text>
                <Text style={styles.statLabel}>Trực tuyến</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalDevices - onlineDevices.length}</Text>
                <Text style={styles.statLabel}>Ngoại tuyến</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
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
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16, // Giảm padding để buttons gần mép hơn
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 120, // Tăng padding để tránh TabBar và safe area
  },
  
  // Modern Header Styles
  modernHeader: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8, // Giảm padding để buttons gần mép hơn
    marginBottom: 12,
  },
  menuButton: {
    marginRight: 8, // Giảm margin
  },
  menuButtonBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
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
    marginLeft: 8, // Giảm margin để gần mép hơn
  },
  addButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll Content
  scrollContent: {
    flex: 1,
  },

  // Status Overview Styles
  statusOverview: {
    marginBottom: 20,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    backdropFilter: 'blur(10px)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statusSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusAction: {
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#8BC34A',
  },
  statusActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8BC34A',
  },

  // Device Grid Styles
  deviceGrid: {
    marginBottom: 20,
  },
  gridHeader: {
    marginBottom: 16,
  },
  gridTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gridSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Device Card Styles
  deviceCard: {
    width: (width - 60) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  deviceLocation: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  deviceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8BC34A',
    marginBottom: 12,
  },
  deviceControl: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8BC34A',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },

  // Loading and Empty States
  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
    width: '100%',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    width: '100%',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#8BC34A',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Statistics Styles
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    backdropFilter: 'blur(10px)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8BC34A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});

export default DashboardScreen;
