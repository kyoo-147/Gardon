import React, { useEffect, useState } from 'react';
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
  Searchbar,
  Menu,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMqtt } from '../../context/MqttContext';
import { formatTimestamp } from '../../utils';
import { COLORS } from '../../constants';
import DeviceWidget from '../../components/DeviceWidget';

const { width } = Dimensions.get('window');

const DevicesScreen = ({ navigation }) => {
  const theme = useTheme();
  const {
    devices,
    rooms,
    mqttStatus,
    disconnectMqtt,
    loadDevices,
    loadRooms,
    deleteDevice,
    controlDevice,
    refreshDevice,
    isLoading,
    error,
    clearError,
  } = useMqtt();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('All');
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (error) {
      setSnackbarMessage(error);
      setShowSnackbar(true);
      clearError();
    }
  }, [error]);

  const loadData = async () => {
    try {
      await Promise.all([
        loadDevices(selectedRoom === 'All' ? null : selectedRoom),
        loadRooms(),
      ]);
    } catch (error) {
      console.error('Error loading devices data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSelectMqtt = async () => {
    await disconnectMqtt();
    navigation.navigate('MqttSelection');
  };

  const handleAddDevice = () => {
    navigation.navigate('AddDevice');
  };

  const handleEditDevice = (device) => {
    navigation.navigate('EditDevice', { device });
  };

  const handleDeviceDetail = (device) => {
    navigation.navigate('DeviceDetail', { deviceId: device._id });
  };

  const handleDeleteDevice = (device) => {
    Alert.alert(
      'Xóa thiết bị',
      `Bạn có chắc chắn muốn xóa "${device.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDevice(device._id);
              setSnackbarMessage('Xóa thiết bị thành công');
              setShowSnackbar(true);
            } catch (error) {
              setSnackbarMessage('Không thể xóa thiết bị');
              setShowSnackbar(true);
            }
          },
        },
      ]
    );
  };

  const handleControlDevice = async (deviceId, command, value = null) => {
    if (mqttStatus !== 'connected') {
      setSnackbarMessage('MQTT chưa kết nối');
      setShowSnackbar(true);
      throw new Error('MQTT not connected');
    }

    try {
      const device = devices.find(d => d._id === deviceId);
      if (!device) {
        setSnackbarMessage('Device not found');
        setShowSnackbar(true);
        throw new Error('Device not found');
      }

      // Use the controlDevice function from useMqtt hook
      const result = await controlDevice(deviceId, command, value);
      
      console.log(`✅ Device control successful: ${device.name} -> ${command}:${value}`, result);
      
      setSnackbarMessage(`✅ Command sent to ${device.name}`);
      setShowSnackbar(true);
      
      return result;
    } catch (error) {
      console.error('❌ Error controlling device:', error);
      const deviceName = devices.find(d => d._id === deviceId)?.name || 'device';
      setSnackbarMessage(`❌ Failed to control ${deviceName}: ${error.message}`);
      setShowSnackbar(true);
      throw error;
    }
  };

  const handleRoomFilter = (room) => {
    setSelectedRoom(room);
    setShowRoomMenu(false);
    loadDevices(room === 'All' ? null : room);
  };

  const getDeviceIcon = (widgetType) => {
    switch (widgetType) {
      case 'switch':
        return 'toggle';
      case 'sensor':
        return 'stats-chart';
      case 'slider':
        return 'options';
      case 'colorPicker':
        return 'color-palette';
      case 'button':
        return 'radio-button-on';
      case 'textInput':
        return 'text';
      case 'timePicker':
        return 'time';
      case 'multiState':
        return 'list';
      case 'chart':
        return 'bar-chart';
      case 'gauge':
        return 'speedometer';
      default:
        return 'phone-portrait';
    }
  };

  const getStatusColor = (device) => {
    if (!device.currentState?.online) return '#F44336';
    return '#4CAF50';
  };

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (device.room && device.room.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const roomOptions = ['All', ...rooms];

  const renderDeviceCard = (device) => (
    <TouchableOpacity 
      key={device._id} 
      style={styles.deviceCard}
      activeOpacity={0.8}
      onPress={() => handleDeviceDetail(device)}
    >
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
        style={styles.deviceCardGradient}
      >
        <View style={styles.deviceHeader}>
          <View style={styles.deviceIconContainer}>
            <Ionicons
              name={getDeviceIcon(device.widgetType)}
              size={24}
              color={device.currentState?.online ? '#8BC34A' : 'rgba(255, 255, 255, 0.5)'}
            />
          </View>
          
          <View style={[
            styles.deviceStatus, 
            { backgroundColor: device.currentState?.online ? '#8BC34A' : '#FF6B6B' }
          ]} />
        </View>

        <Text style={styles.deviceName} numberOfLines={1}>
          {device.name}
        </Text>
        
        {device.room && (
          <Text style={styles.deviceRoom} numberOfLines={1}>
            {device.room}
          </Text>
        )}
        
        <Text style={styles.deviceType}>
          {device.widgetType.replace(/([A-Z])/g, ' $1').toUpperCase()}
        </Text>

        {device.currentState?.lastUpdated && (
          <Text style={styles.lastUpdated}>
            {formatTimestamp(device.currentState.lastUpdated)}
          </Text>
        )}

        {/* Device Controls */}
        <View style={styles.deviceControls}>
          <DeviceWidget 
            device={device}
            size="small"
            showTitle={false}
            onControl={handleControlDevice}
            onRefreshDevice={refreshDevice}
          />
        </View>

        {/* Device Actions */}
        <View style={styles.deviceActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditDevice(device)}
          >
            <Ionicons name="pencil" size={16} color="rgba(255, 255, 255, 0.8)" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteDevice(device)}
          >
            <Ionicons name="trash" size={16} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
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
                <Text style={styles.headerTitle}>Thiết bị vườn</Text>
                <Text style={styles.headerSubtitle}>
                  {devices.length} thiết bị • {
                    devices.filter(d => d.currentState?.online).length
                  } online
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddDevice}
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

            {/* Search and Filter */}
            <View style={styles.searchContainer}>
              <Searchbar
                placeholder="Tìm kiếm thiết bị..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
                inputStyle={styles.searchInput}
                iconColor="rgba(255, 255, 255, 0.7)"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />
              
              <Menu
                visible={showRoomMenu}
                onDismiss={() => setShowRoomMenu(false)}
                anchor={
                  <TouchableOpacity
                    onPress={() => setShowRoomMenu(true)}
                    style={styles.filterButton}
                  >
                    <Text style={styles.filterButtonText}>{selectedRoom}</Text>
                    <Ionicons name="chevron-down" size={16} color="rgba(255, 255, 255, 0.8)" />
                  </TouchableOpacity>
                }
              >
                {roomOptions.map(room => (
                  <Menu.Item
                    key={room}
                    onPress={() => handleRoomFilter(room)}
                    title={room}
                    leadingIcon={selectedRoom === room ? 'check' : undefined}
                  />
                ))}
              </Menu>
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
            {/* MQTT Status Warning */}
            {mqttStatus !== 'connected' && (
              <View style={styles.warningCard}>
                <View style={styles.warningContent}>
                  <Ionicons name="warning" size={24} color="#FFB74D" />
                  <View style={styles.warningText}>
                    <Text style={styles.warningTitle}>MQTT đã ngắt kết nối</Text>
                    <Text style={styles.warningSubtitle}>
                      Kết nối MQTT để điều khiển thiết bị của bạn
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleSelectMqtt}
                    style={styles.warningButton}
                  >
                    <Text style={styles.warningButtonText}>Kết nối</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Devices List */}
            {isLoading && devices.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.loadingText}>Đang tải thiết bị...</Text>
              </View>
            ) : filteredDevices.length > 0 ? (
              <View style={styles.devicesGrid}>
                {filteredDevices.map(renderDeviceCard)}
                {/* Thêm thiết bị */}
                <TouchableOpacity 
                  style={styles.addDeviceCard}
                  onPress={handleAddDevice}
                  activeOpacity={0.8}
                >
                  <View style={styles.addDeviceContent}>
                    <View style={styles.addDeviceIcon}>
                      <Ionicons name="home-outline" size={32} color="rgba(255, 255, 255, 0.6)" />
                    </View>
                    <Text style={styles.addDeviceTitle}>Không tìm thấy thiết bị?</Text>
                    <Text style={styles.addDeviceSubtitle}>Chọn thủ công</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <Ionicons name="phone-portrait-outline" size={60} color="rgba(255, 255, 255, 0.4)" />
                  <Text style={styles.emptyTitle}>
                    {searchQuery ? 'Không tìm thấy thiết bị' : 'Không có thiết bị'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery
                      ? 'Try adjusting your search or filter'
                      : 'Add your first device to get started'
                    }
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity
                      onPress={handleAddDevice}
                      style={styles.emptyButton}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                      <Text style={styles.emptyButtonText}>Thêm thiết bị</Text>
                    </TouchableOpacity>
                  )}
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
    marginBottom: 12,
  },
  menuButton: {
    marginRight: 8, // Giảm margin
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
    marginLeft: 16,
  },
  addButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    height: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    elevation: 0,
  },
  searchInput: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    minWidth: 80,
  },
  filterButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginRight: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Tăng padding để tránh TabBar
  },
  warningCard: {
    backgroundColor: 'rgba(255, 183, 77, 0.15)',
    borderRadius: 16,
    marginBottom: 20,
    padding: 16,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warningText: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFB74D',
    marginBottom: 4,
  },
  warningSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 183, 77, 0.8)',
  },
  warningButton: {
    backgroundColor: '#FFB74D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  warningButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  devicesList: {
    gap: 16,
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  deviceCard: {
    width: (width - 56) / 2, // 2 columns with 20px padding each side and 16px gap
    borderRadius: 16,
    overflow: 'hidden',
  },
  deviceCardGradient: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 180,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  deviceRoom: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 8,
  },
  deviceControls: {
    marginVertical: 8,
    minHeight: 40,
  },
  deviceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  addDeviceCard: {
    width: (width - 56) / 2,
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDeviceContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  addDeviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addDeviceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 4,
  },
  addDeviceSubtitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8BC34A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  snackbar: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
});

export default DevicesScreen;
