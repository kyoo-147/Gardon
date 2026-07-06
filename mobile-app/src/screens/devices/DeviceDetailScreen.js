import React, { useState, useContext, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  StatusBar, 
  TouchableOpacity,
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Text, 
  Card, 
  Button, 
  Chip,
  IconButton,
  Divider,
  Switch,
  Slider,
  ActivityIndicator
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthContext from '../../context/AuthContext';
import { useMqtt } from '../../context/MqttContext';
import { COLORS } from '../../constants';
import DeviceWidget from '../../components/DeviceWidget';

const { width } = Dimensions.get('window');

const DeviceDetailScreen = (props) => {
  const { route, navigation } = props || {};
  const { deviceId } = route?.params || {};
  const { user, token } = useContext(AuthContext);
  const { devices, controlDevice, deleteDevice: deleteDeviceFromContext } = useMqtt();
  
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [controlValue, setControlValue] = useState(0);

  useEffect(() => {
    // Find device from context instead of fetching
    const foundDevice = devices.find(d => d._id === deviceId);
    if (foundDevice) {
      setDevice(foundDevice);
      setControlValue(foundDevice.currentState?.value || 0);
      setLoading(false);
    } else {
      // If device not found in context, navigate back
      Alert.alert('Lỗi', 'Không tìm thấy thiết bị');
      navigation.goBack();
    }
  }, [deviceId, devices, navigation]);

  useEffect(() => {
    if (device) {
      // Set header options with edit button
      navigation.setOptions({
        headerShown: false, // Ẩn header mặc định
      });
    }
  }, [device, navigation]);

  const handleControlDevice = async (deviceId, command, value = null) => {
    try {
      await controlDevice(deviceId, command, value);
      // Update local state if needed
      if (command === 'ON' || command === 'OFF' || command === true || command === false) {
        setControlValue(command === 'ON' || command === true ? 1 : 0);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể gửi lệnh');
    }
  };

  const handleSliderChange = async (value) => {
    setControlValue(value);
    try {
      await controlDevice(device._id, 'setValue', value);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể gửi lệnh');
    }
  };

  const handleDeleteDevice = () => {
    Alert.alert(
      'Xóa thiết bị',
      'Bạn có chắc chắn muốn xóa thiết bị này?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: confirmDelete }
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      await deleteDeviceFromContext(device._id);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể xóa thiết bị');
    }
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#4CAF50';
      case 'offline': return '#F44336';
      default: return '#FF9800';
    }
  };

  const renderControl = () => {
    if (!device) return null;

    return (
      <View style={styles.controlSection}>
        <Text style={styles.sectionTitle}>Device Control</Text>
        <View style={styles.controlContainer}>
          <DeviceWidget 
            device={device}
            size="normal"
            showTitle={false}
            onControl={handleControlDevice}
            onRefreshDevice={() => {}}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#767E67', '#4C533E', '#3C3C40', '#3C3C40']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backgroundGradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.loadingText}>Loading device details...</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#767E67', '#4C533E', '#3C3C40', '#3C3C40']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backgroundGradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Không tìm thấy thiết bị</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  const currentStatus = device.currentState?.online ? 'online' : 'offline';

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
          {/* Custom Header với Back Button */}
          <View style={styles.modernHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <View style={styles.backButtonBackground}>
                <Ionicons name="arrow-back" size={24} color="rgba(255, 255, 255, 0.9)" />
              </View>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{device.name}</Text>
              <Text style={styles.headerSubtitle}>
                {device.widgetType?.replace(/([A-Z])/g, ' $1').toUpperCase()} • {currentStatus.toUpperCase()}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => navigation.navigate('EditDevice', { device })}
            >
              <View style={styles.editButtonBackground}>
                <Ionicons name="settings-outline" size={20} color="rgba(255, 255, 255, 0.9)" />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Device Info Card */}
            <TouchableOpacity style={styles.deviceInfoCard} activeOpacity={1}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.deviceInfoGradient}
              >
                <View style={styles.deviceHeader}>
                  <View style={styles.deviceIconContainer}>
                    <Ionicons
                      name={getDeviceIcon(device.widgetType)}
                      size={32}
                      color={device.currentState?.online ? '#8BC34A' : 'rgba(255, 255, 255, 0.5)'}
                    />
                  </View>
                  
                  <View style={[
                    styles.deviceStatus, 
                    { backgroundColor: device.currentState?.online ? '#8BC34A' : '#FF6B6B' }
                  ]} />
                </View>

                <Text style={styles.deviceName} numberOfLines={2}>
                  {device.name}
                </Text>
                
                {device.room && (
                  <Text style={styles.deviceRoom}>
                    📍 {device.room}
                  </Text>
                )}
                
                {device.description && (
                  <Text style={styles.deviceDescription}>
                    {device.description}
                  </Text>
                )}

                <View style={styles.deviceMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Topic</Text>
                    <Text style={styles.metaValue}>{device.topic}</Text>
                  </View>
                  
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Added</Text>
                    <Text style={styles.metaValue}>
                      {new Date(device.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Control Section */}
            {renderControl()}

            {/* Actions Section */}
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Device Actions</Text>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('EditDevice', { device })}
              >
                <LinearGradient
                  colors={['rgba(139, 195, 74, 0.2)', 'rgba(139, 195, 74, 0.1)']}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="pencil" size={20} color="#8BC34A" />
                  <Text style={styles.actionButtonText}>Edit Device Settings</Text>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDeleteDevice}
              >
                <LinearGradient
                  colors={['rgba(255, 107, 107, 0.2)', 'rgba(255, 107, 107, 0.1)']}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="trash" size={20} color="#FF6B6B" />
                  <Text style={[styles.actionButtonText, { color: '#FF6B6B' }]}>Remove from Garden</Text>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
                </LinearGradient>
              </TouchableOpacity>
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
  },
  safeArea: {
    flex: 1,
  },
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonBackground: {
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
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 1,
  },
  editButton: {
    marginLeft: 16,
  },
  editButtonBackground: {
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
    paddingBottom: 40,
  },
  deviceInfoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  deviceInfoGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceStatus: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  deviceName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  deviceRoom: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  deviceDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
    lineHeight: 20,
  },
  deviceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  controlSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  controlContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#FF6B6B',
  },
});

export default DeviceDetailScreen;
