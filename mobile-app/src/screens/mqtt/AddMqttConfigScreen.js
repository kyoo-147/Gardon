import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import {
  Card,
  Title,
  TextInput,
  Button,
  Switch,
  Text,
  Snackbar,
  Chip,
  HelperText,
  Divider,
  SegmentedButtons,
  ActivityIndicator,
  Surface,
  Avatar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AuthContext from '../../context/AuthContext';
import { useMqtt } from '../../context/MqttContext';
import { apiService } from '../../services/api';
import { generateClientId, validateMqttConfig } from '../../utils';
import { COLORS, API_BASE_URL } from '../../constants';

// Common theme for all TextInputs
const INPUT_THEME = {
  colors: {
    primary: '#8BC34A',
    background: 'rgba(255, 255, 255, 0.1)',
    onSurface: '#FFFFFF',
    outline: 'rgba(255, 255, 255, 0.3)',
    placeholder: 'rgba(255, 255, 255, 0.6)',
    onSurfaceVariant: 'rgba(255, 255, 255, 0.6)', // For labels
  }
};

const AddMqttConfigScreen = ({ navigation }) => {
  const { createConfig, testConnection, isLoading } = useMqtt();
  const { token } = useContext(AuthContext);

  // Available configs state
  const [availableConfigs, setAvailableConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [requestingConfigs, setRequestingConfigs] = useState(new Set());

  const [formData, setFormData] = useState({
    name: '',
    host: 'broker.emqx.io',
    port: '8083',
    protocol: 'ws',
    path: '/mqtt',
    username: '',
    password: '',
    clientId: `mqttx_${Math.random().toString(16).substr(2, 8)}`,
    // Connection Settings
    mqttVersion: '5.0',
    connectTimeout: '10',
    keepAlive: '60',
    autoReconnect: true,
    reconnectPeriod: '4000',
    cleanStart: true,
    // Advanced Settings
    sessionExpiryInterval: '0',
    receiveMaximum: '65535',
    maximumPacketSize: '268435455',
    topicAliasMaximum: '65535',
    requestResponseInfo: false,
    requestProblemInfo: false,
    // SSL/TLS
    useSSL: false,
    // Last Will and Testament
    lastWillTopic: '',
    lastWillQos: '0',
    lastWillRetain: false,
    lastWillPayload: '',
    lastWillPayloadFormatIndicator: false,
    lastWillDelayInterval: '0',
    lastWillMessageExpiryInterval: '0',
    lastWillContentType: '',
    lastWillResponseTopic: '',
    lastWillCorrelationData: '',
    // User Properties
    userProperties: [],
    description: '',
    isDefault: false,
  });

  const [errors, setErrors] = useState({});
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [testing, setTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLastWill, setShowLastWill] = useState(false);

  // Fetch available configs
  useEffect(() => {
    fetchAvailableConfigs();
  }, []);

  const fetchAvailableConfigs = async () => {
    try {
      setLoadingConfigs(true);
      const response = await fetch(`${API_BASE_URL}/mqtt-requests/available`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableConfigs(data.configs || []);
      } else {
        console.error('Failed to fetch available configs');
      }
    } catch (error) {
      console.error('Error fetching available configs:', error);
    } finally {
      setLoadingConfigs(false);
    }
  };

  const sendJoinRequest = async (config, message = '') => {
    try {
      setRequestingConfigs(prev => new Set([...prev, config._id]));
      
      const response = await fetch(`${API_BASE_URL}/mqtt-requests/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mqttConfigId: config._id,
          message: message,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSnackbarMessage(`Gửi yêu cầu đến ${config.adminUsername}!`);
        setShowSnackbar(true);
        setAvailableConfigs(prev => prev.filter(c => c._id !== config._id));
      } else {
        setSnackbarMessage(data.message || 'Không thể gửi yêu cầu tham gia');
        setShowSnackbar(true);
      }
    } catch (error) {
      setSnackbarMessage('Không thể gửi yêu cầu tham gia');
      setShowSnackbar(true);
    } finally {
      setRequestingConfigs(prev => {
        const newSet = new Set(prev);
        newSet.delete(config._id);
        return newSet;
      });
    }
  };

  const handleJoinRequest = (config) => {
    Alert.alert(
      'Tham gia mạng',
      `Gửi yêu cầu tham gia "${config.name}" do ${config.adminUsername} quản lý?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Gửi yêu cầu', onPress: () => sendJoinRequest(config, `Chào, tôi muốn tham gia mạng ${config.name} của bạn.`) }
      ]
    );
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = () => {
    const configData = {
      ...formData,
      port: parseInt(formData.port),
    };

    const validationErrors = validateMqttConfig(configData);
    const newErrors = {};

    validationErrors.forEach(error => {
      if (error.includes('name')) newErrors.name = error;
      if (error.includes('host')) newErrors.host = error;
      if (error.includes('port')) newErrors.port = error;
      if (error.includes('Client ID')) newErrors.clientId = error;
    });

    // Additional validations
    if (formData.port && (isNaN(formData.port) || parseInt(formData.port) < 1 || parseInt(formData.port) > 65535)) {
      newErrors.port = 'Cổng phải nằm trong khoảng từ 1 đến 65535';
    }

    if (formData.lastWillTopic && !formData.lastWillTopic.trim()) {
      newErrors.lastWillTopic = 'Chủ đề sẽ được sử dụng khi sẽ được kích hoạt';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) {
      setSnackbarMessage('Vui lòng sửa các lỗi xác thực');
      setShowSnackbar(true);
      return;
    }

    setTesting(true);
    try {
      const testData = {
        host: formData.host.trim(),
        port: parseInt(formData.port),
        protocol: formData.protocol,
        path: formData.path,
        username: formData.username?.trim() || undefined,
        password: formData.password || undefined,
        clientId: formData.clientId.trim(),
        mqttVersion: formData.mqttVersion,
        useSSL: formData.useSSL,
        connectTimeout: parseInt(formData.connectTimeout) * 1000, // Convert to milliseconds
        keepAlive: parseInt(formData.keepAlive),
      };

      console.log('Testing MQTT connection with data:', testData);
      const result = await testConnection(testData);
      if (result.success) {
        setSnackbarMessage('Kiểm tra kết nối thành công!');
        setShowSnackbar(true);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setSnackbarMessage(error.message || 'Lỗi kiểm tra kết nối');
      setShowSnackbar(true);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setSnackbarMessage('Vui lòng sửa các lỗi xác thực');
      setShowSnackbar(true);
      return;
    }

    try {
      const configData = {
        name: formData.name.trim(),
        host: formData.host.trim(),
        port: parseInt(formData.port),
        protocol: formData.protocol,
        path: formData.path,
        username: formData.username.trim() || undefined,
        password: formData.password || undefined,
        clientId: formData.clientId.trim(),
        mqttVersion: formData.mqttVersion,
        connectTimeout: parseInt(formData.connectTimeout) * 1000,
        keepAlive: parseInt(formData.keepAlive),
        autoReconnect: formData.autoReconnect,
        reconnectPeriod: parseInt(formData.reconnectPeriod),
        cleanStart: formData.cleanStart,
        useSSL: formData.useSSL,
        // MQTT 5.0 Advanced Settings
        sessionExpiryInterval: parseInt(formData.sessionExpiryInterval),
        receiveMaximum: parseInt(formData.receiveMaximum),
        maximumPacketSize: parseInt(formData.maximumPacketSize),
        topicAliasMaximum: parseInt(formData.topicAliasMaximum),
        requestResponseInfo: formData.requestResponseInfo,
        requestProblemInfo: formData.requestProblemInfo,
        // Last Will and Testament
        lastWillTopic: formData.lastWillTopic.trim() || undefined,
        lastWillQos: parseInt(formData.lastWillQos),
        lastWillRetain: formData.lastWillRetain,
        lastWillPayload: formData.lastWillPayload || undefined,
        lastWillPayloadFormatIndicator: formData.lastWillPayloadFormatIndicator,
        lastWillDelayInterval: parseInt(formData.lastWillDelayInterval),
        lastWillMessageExpiryInterval: parseInt(formData.lastWillMessageExpiryInterval),
        lastWillContentType: formData.lastWillContentType || undefined,
        lastWillResponseTopic: formData.lastWillResponseTopic || undefined,
        lastWillCorrelationData: formData.lastWillCorrelationData || undefined,
        // User Properties
        userProperties: formData.userProperties,
        description: formData.description.trim() || undefined,
        isDefault: formData.isDefault,
      };

      await createConfig(configData);
      setSnackbarMessage('Lưu cấu hình thành công!');
      setShowSnackbar(true);
      
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      setSnackbarMessage('Không thể lưu cấu hình');
      setShowSnackbar(true);
    }
  };

  const generateNewClientId = () => {
    const newClientId = generateClientId();
    handleInputChange('clientId', newClientId);
    setSnackbarMessage('Client ID mới đã được tạo');
    setShowSnackbar(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Modern Gradient Background */}
      <LinearGradient
        colors={['#767E67', '#4C533E', '#3C3C40', '#3C3C40']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Modern Header with Back Button */}
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
              <Text style={styles.headerTitle}>Thêm kết nối Gardon</Text>
              <Text style={styles.headerSubtitle}>Kết nối với broker MQTT của bạn</Text>
            </View>

            <View style={styles.headerRight}>
              {/* Placeholder for balance */}
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <ScrollView 
              style={styles.scrollView} 
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Join Existing Networks Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🤝 Tham gia mạng hiện có</Text>

                {loadingConfigs ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#8BC34A" />
                    <Text style={styles.loadingText}>Đang tải các mạng có sẵn...</Text>
                  </View>
                ) : availableConfigs.length > 0 ? (
                  <View style={styles.availableConfigsList}>
                    {availableConfigs.map((config) => {
                      const isRequesting = requestingConfigs.has(config._id);
                      return (
                        <View key={config._id} style={styles.availableConfigCard}>
                          <View style={styles.configHeader}>
                            <View style={styles.configInfo}>
                              <Avatar.Text
                                size={40}
                                label={config.adminUsername.charAt(0).toUpperCase()}
                                style={styles.adminAvatar}
                                color="#FFFFFF"
                              />
                              <View style={styles.configDetails}>
                                <Text style={styles.configName}>{config.name}</Text>
                                <Text style={styles.configAdmin}>by {config.adminUsername}</Text>
                                <Text style={styles.configMeta}>
                                  {config.host}:{config.port}
                                </Text>
                              </View>
                            </View>
                            
                            <TouchableOpacity
                              style={[styles.joinButton, isRequesting && styles.joinButtonDisabled]}
                              onPress={() => handleJoinRequest(config)}
                              disabled={isRequesting}
                            >
                              <LinearGradient
                                colors={isRequesting ? ['#666', '#555'] : ['#8BC34A', '#689F38']}
                                style={styles.joinButtonGradient}
                              >
                                {isRequesting ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <>
                                    <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
                                    <Text style={styles.joinButtonText}>Join</Text>
                                  </>
                                )}
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                          
                          {config.description && (
                            <Text style={styles.configDescription}>{config.description}</Text>                              )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="wifi-outline" size={40} color="rgba(255, 255, 255, 0.4)" />
                    <Text style={styles.emptyText}>Không có mạng nào để tham gia</Text>
                    <Text style={styles.emptySubtext}>Tạo mạng của riêng bạn bên dưới</Text>
                  </View>
                )}
              </View>

              {/* Create New Configuration */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🌱 Tạo mạng mới</Text>

                <TextInput
                  label="Tên mạng"
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  error={!!errors.name}
                  style={styles.input}
                  placeholder="Mạng Gardon của tôi"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  left={<TextInput.Icon icon="leaf" color="#8BC34A" />}
                  theme={{ 
                    colors: { 
                      primary: '#8BC34A',
                      background: 'rgba(255, 255, 255, 0.1)',
                      onSurface: '#FFFFFF',
                      outline: 'rgba(255, 255, 255, 0.3)',
                      placeholder: 'rgba(255, 255, 255, 0.6)'
                    } 
                  }}
                  textColor="#FFFFFF"
                />
                <HelperText type="error" visible={!!errors.name} style={{ color: '#FFB3B3' }}>
                  {errors.name}
                </HelperText>

                <TextInput
                  label="Broker Host"
                  value={formData.host}
                  onChangeText={(value) => handleInputChange('host', value)}
                  error={!!errors.host}
                  style={styles.input}
                  placeholder="broker.hivemq.com"
                  autoCapitalize="none"
                  left={<TextInput.Icon icon="server" color="#8BC34A" />}
                  theme={{ 
                    colors: { 
                      primary: '#8BC34A',
                      background: 'rgba(255, 255, 255, 0.1)',
                      onSurface: '#FFFFFF',
                      outline: 'rgba(255, 255, 255, 0.3)'
                    } 
                  }}
                  textColor="#FFFFFF"
                />
                <HelperText type="error" visible={!!errors.host} style={{ color: '#FFB3B3' }}>
                  {errors.host}
                </HelperText>

                <TextInput
                  label="Cổng"
                  value={formData.port}
                  onChangeText={(value) => handleInputChange('port', value)}
                  error={!!errors.port}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="1883"
                  left={<TextInput.Icon icon="ethernet" color="#8BC34A" />}
                  theme={{ 
                    colors: { 
                      primary: '#8BC34A',
                      background: 'rgba(255, 255, 255, 0.1)',
                      onSurface: '#FFFFFF',
                      outline: 'rgba(255, 255, 255, 0.3)'
                    } 
                  }}
                  textColor="#FFFFFF"
                />
                <HelperText type="error" visible={!!errors.port} style={{ color: '#FFB3B3' }}>
                  {errors.port}
                </HelperText>

                <TextInput
                  label="Phương thức"
                  value={formData.protocol}
                  onChangeText={(value) => handleInputChange('protocol', value)}
                  style={styles.input}
                  placeholder="ws"
                  left={<TextInput.Icon icon="protocol" color="#8BC34A" />}
                  theme={{ 
                    colors: { 
                      primary: '#8BC34A',
                      background: 'rgba(255, 255, 255, 0.1)',
                      onSurface: '#FFFFFF',
                      outline: 'rgba(255, 255, 255, 0.3)'
                    } 
                  }}
                  textColor="#FFFFFF"
                />

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Đặt mạng mặc định</Text>
                  <Switch
                    value={formData.isDefault}
                    onValueChange={(value) => handleInputChange('isDefault', value)}
                    thumbColor={formData.isDefault ? '#8BC34A' : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: 'rgba(139, 195, 74, 0.3)' }}
                  />
                </View>
              </View>

              {/* Authentication */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔐 Xác thực (Tùy chọn)</Text>

                <TextInput
                  label="Tên người dùng"
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  left={<TextInput.Icon icon="account" color="#8BC34A" />}
                  theme={{ 
                    colors: { 
                      primary: '#8BC34A',
                      background: 'rgba(255, 255, 255, 0.1)',
                      onSurface: '#FFFFFF',
                      outline: 'rgba(255, 255, 255, 0.3)'
                    } 
                  }}
                  textColor="#FFFFFF"
                />

                <TextInput
                  label="Mật khẩu"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  style={styles.input}
                  secureTextEntry
                  left={<TextInput.Icon icon="lock" color="#8BC34A" />}
                  theme={{ 
                    colors: { 
                      primary: '#8BC34A',
                      background: 'rgba(255, 255, 255, 0.1)',
                      onSurface: '#FFFFFF',
                      outline: 'rgba(255, 255, 255, 0.3)'
                    } 
                  }}
                  textColor="#FFFFFF"
                />
              </View>

              {/* Advanced Settings */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚙️ Cài đặt nâng cao</Text>

                <View style={styles.clientIdRow}>
                  <TextInput
                    label="Client ID"
                    value={formData.clientId}
                    onChangeText={(value) => handleInputChange('clientId', value)}
                    error={!!errors.clientId}
                    style={[styles.input, styles.clientIdInput]}
                    left={<TextInput.Icon icon="identifier" color="#8BC34A" />}
                    theme={{ 
                      colors: { 
                        primary: '#8BC34A',
                        background: 'rgba(255, 255, 255, 0.1)',
                        onSurface: '#FFFFFF',
                        outline: 'rgba(255, 255, 255, 0.3)'
                      } 
                    }}
                    textColor="#FFFFFF"
                  />
                  <TouchableOpacity
                    onPress={generateNewClientId}
                    style={styles.generateButton}
                  >
                    <LinearGradient
                      colors={['#8BC34A', '#689F38']}
                      style={styles.generateButtonGradient}
                    >
                      <Text style={styles.generateButtonText}>Tạo</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <HelperText type="error" visible={!!errors.clientId} style={{ color: '#FFB3B3' }}>
                  {errors.clientId}
                </HelperText>

                <View style={styles.advancedRow}>
                  <TextInput
                    label="Keep Alive (s)"
                    value={formData.keepAlive}
                    onChangeText={(value) => handleInputChange('keepAlive', value)}
                    style={[styles.input, styles.halfInput]}
                    keyboardType="numeric"
                    theme={{ 
                      colors: { 
                        primary: '#8BC34A',
                        background: 'rgba(255, 255, 255, 0.1)',
                        onSurface: '#FFFFFF',
                        outline: 'rgba(255, 255, 255, 0.3)'
                      } 
                    }}
                    textColor="#FFFFFF"
                  />
                  <TextInput
                    label="Thời gian chờ kết nối (s)"
                    value={formData.connectTimeout}
                    onChangeText={(value) => handleInputChange('connectTimeout', value)}
                    style={[styles.input, styles.halfInput]}
                    keyboardType="numeric"
                    theme={{ 
                      colors: { 
                        primary: '#8BC34A',
                        background: 'rgba(255, 255, 255, 0.1)',
                        onSurface: '#FFFFFF',
                        outline: 'rgba(255, 255, 255, 0.3)'
                      } 
                    }}
                    textColor="#FFFFFF"
                  />
                </View>

                <TextInput
                  label="Chu kỳ tái kết nối (ms)"
                  value={formData.reconnectPeriod}
                  onChangeText={(value) => handleInputChange('reconnectPeriod', value)}
                  style={styles.input}
                  keyboardType="numeric"
                  theme={{ 
                    colors: { 
                      primary: '#8BC34A',
                      background: 'rgba(255, 255, 255, 0.1)',
                      onSurface: '#FFFFFF',
                      outline: 'rgba(255, 255, 255, 0.3)'
                    } 
                  }}
                  textColor="#FFFFFF"
                />

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Tự động kết nối lại</Text>
                  <Switch
                    value={formData.autoReconnect}
                    onValueChange={(value) => handleInputChange('autoReconnect', value)}
                    thumbColor={formData.autoReconnect ? '#8BC34A' : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: 'rgba(139, 195, 74, 0.3)' }}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Bắt đầu dọn dẹp</Text>
                  <Switch
                    value={formData.cleanStart}
                    onValueChange={(value) => handleInputChange('cleanStart', value)}
                    thumbColor={formData.cleanStart ? '#8BC34A' : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: 'rgba(139, 195, 74, 0.3)' }}
                  />
                </View>
              </View>

              {/* Will Message */}
              <View style={styles.section}>
                <View style={styles.switchRow}>
                  <Text style={styles.sectionTitle}>🔗 Last Will & Testament</Text>
                  <Switch
                    value={showLastWill}
                    onValueChange={setShowLastWill}
                    thumbColor={showLastWill ? '#8BC34A' : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: 'rgba(139, 195, 74, 0.3)' }}
                  />
                </View>

                {showLastWill && (
                  <View style={styles.willSection}>
                    <TextInput
                      label="Will Topic"
                      value={formData.lastWillTopic}
                      onChangeText={(value) => handleInputChange('lastWillTopic', value)}
                      error={!!errors.lastWillTopic}
                      style={styles.input}
                      placeholder="device/status"
                      theme={{ 
                        colors: { 
                          primary: '#8BC34A',
                          background: 'rgba(255, 255, 255, 0.1)',
                          onSurface: '#FFFFFF',
                          outline: 'rgba(255, 255, 255, 0.3)'
                        } 
                      }}
                      textColor="#FFFFFF"
                    />
                    <HelperText type="error" visible={!!errors.lastWillTopic} style={{ color: '#FFB3B3' }}>
                      {errors.lastWillTopic}
                    </HelperText>

                    <TextInput
                      label="Will Message"
                      value={formData.lastWillPayload}
                      onChangeText={(value) => handleInputChange('lastWillPayload', value)}
                      style={styles.input}
                      placeholder="offline"
                      theme={{ 
                        colors: { 
                          primary: '#8BC34A',
                          background: 'rgba(255, 255, 255, 0.1)',
                          onSurface: '#FFFFFF',
                          outline: 'rgba(255, 255, 255, 0.3)'
                        } 
                      }}
                      textColor="#FFFFFF"
                    />

                    <View style={styles.willRow}>
                      <TextInput
                        label="QoS"
                        value={formData.lastWillQos}
                        onChangeText={(value) => handleInputChange('lastWillQos', value)}
                        style={[styles.input, styles.halfInput]}
                        keyboardType="numeric"
                        theme={{ 
                          colors: { 
                            primary: '#8BC34A',
                            background: 'rgba(255, 255, 255, 0.1)',
                            onSurface: '#FFFFFF',
                            outline: 'rgba(255, 255, 255, 0.3)'
                          } 
                        }}
                        textColor="#FFFFFF"
                      />
                      <View style={styles.willRetainContainer}>
                        <Text style={styles.switchLabel}>Retain</Text>
                        <Switch
                          value={formData.lastWillRetain}
                          onValueChange={(value) => handleInputChange('lastWillRetain', value)}
                          thumbColor={formData.lastWillRetain ? '#8BC34A' : '#f4f3f4'}
                          trackColor={{ false: '#767577', true: 'rgba(139, 195, 74, 0.3)' }}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionContainer}>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={handleTestConnection}
                    disabled={isLoading || testing}
                    style={[styles.testButton, { flex: 1, marginRight: 8 }]}
                  >
                    <LinearGradient
                      colors={['rgba(139, 195, 74, 0.8)', 'rgba(104, 159, 56, 0.8)']}
                      style={styles.testButtonGradient}
                    >
                      {testing ? (
                        <>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.buttonText}> Đang kiểm tra...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="wifi" size={16} color="#FFFFFF" />
                          <Text style={styles.buttonText}> Kiểm tra nhanh</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('MqttTest')}
                    disabled={!formData.host || !formData.port}
                    style={[styles.testButton, { flex: 1, marginLeft: 8 }]}
                  >
                    <LinearGradient
                      colors={['rgba(139, 195, 74, 0.8)', 'rgba(104, 159, 56, 0.8)']}
                      style={styles.testButtonGradient}
                    >
                      <Ionicons name="flask" size={16} color="#FFFFFF" />
                      <Text style={styles.buttonText}> Kiểm tra đầy đủ</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isLoading}
                  style={styles.saveButton}
                >
                  <LinearGradient
                    colors={['#8BC34A', '#689F38']}
                    style={styles.saveButtonGradient}
                  >
                    <Ionicons name="save" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}> Lưu cấu hình</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.bottomSpacing} />
            </ScrollView>
          </KeyboardAvoidingView>

          <Snackbar
            visible={showSnackbar}
            onDismiss={() => setShowSnackbar(false)}
            duration={3000}
            style={styles.snackbar}
          >
            {snackbarMessage}
          </Snackbar>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  clientIdRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  clientIdInput: {
    flex: 1,
    marginRight: 12,
  },
  generateButton: {
    marginTop: 8,
  },
  generateButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  advancedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  willSection: {
    marginTop: 16,
  },
  willRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  willRetainContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  actionContainer: {
    marginTop: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  testButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  testButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 40,
  },
  snackbar: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  // New styles for join section
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    marginLeft: 10,
    fontSize: 14,
  },
  availableConfigsList: {
    marginTop: 8,
  },
  availableConfigCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  configInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminAvatar: {
    backgroundColor: '#8BC34A',
    marginRight: 12,
  },
  configDetails: {
    flex: 1,
  },
  configName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  configAdmin: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 2,
  },
  configMeta: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  joinButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  joinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  configDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default AddMqttConfigScreen;
