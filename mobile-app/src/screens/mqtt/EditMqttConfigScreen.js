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
  Menu,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AuthContext from '../../context/AuthContext';
import { useMqtt } from '../../context/MqttContext';
import { COLORS } from '../../constants';

// Common theme for all TextInputs with bright text colors
const INPUT_THEME = {
  colors: {
    primary: '#8BC34A',
    background: 'rgba(255, 255, 255, 0.1)',
    onSurface: '#FFFFFF',
    outline: 'rgba(255, 255, 255, 0.3)',
    placeholder: 'rgba(255, 255, 255, 0.7)',
    onSurfaceVariant: 'rgba(255, 255, 255, 0.8)', // For labels
  }
};

const EditMqttConfigScreen = (props) => {
  const { route, navigation } = props || {};
  const { config } = route?.params || {};
  const { token } = useContext(AuthContext);
  const { updateConfig, testConnection } = useMqtt();

  // Redirect if no config provided
  useEffect(() => {
    if (!config && navigation) {
      navigation.goBack();
    }
  }, [config, navigation]);

  const [formData, setFormData] = useState({
    name: config?.name || '',
    host: config?.host || '',
    port: config?.port?.toString() || '1883',
    protocol: config?.protocol || 'mqtt',
    path: config?.path || '/mqtt',
    username: config?.username || '',
    password: config?.password || '',
    clientId: config?.clientId || '',
    // Connection Settings
    mqttVersion: config?.mqttVersion || '5.0',
    connectTimeout: (config?.connectTimeout / 1000)?.toString() || '10',
    keepAlive: config?.keepAlive?.toString() || '60',
    autoReconnect: config?.autoReconnect ?? true,
    reconnectPeriod: config?.reconnectPeriod?.toString() || '4000',
    cleanStart: config?.cleanStart ?? true,
    // Advanced Settings (MQTT 5.0)
    sessionExpiryInterval: config?.sessionExpiryInterval?.toString() || '0',
    receiveMaximum: config?.receiveMaximum?.toString() || '65535',
    maximumPacketSize: config?.maximumPacketSize?.toString() || '268435455',
    topicAliasMaximum: config?.topicAliasMaximum?.toString() || '65535',
    requestResponseInfo: config?.requestResponseInfo || false,
    requestProblemInfo: config?.requestProblemInfo || false,
    // SSL/TLS
    useSSL: config?.useSSL || false,
    // Last Will and Testament
    lastWillTopic: config?.lastWillTopic || '',
    lastWillQos: config?.lastWillQos?.toString() || '0',
    lastWillRetain: config?.lastWillRetain || false,
    lastWillPayload: config?.lastWillPayload || '',
    lastWillPayloadFormatIndicator: config?.lastWillPayloadFormatIndicator || false,
    lastWillDelayInterval: config?.lastWillDelayInterval?.toString() || '0',
    lastWillMessageExpiryInterval: config?.lastWillMessageExpiryInterval?.toString() || '0',
    lastWillContentType: config?.lastWillContentType || '',
    lastWillResponseTopic: config?.lastWillResponseTopic || '',
    lastWillCorrelationData: config?.lastWillCorrelationData || '',
    // User Properties
    userProperties: config?.userProperties || [],
    description: config?.description || '',
    isDefault: config?.isDefault || false
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showProtocolMenu, setShowProtocolMenu] = useState(false);
  const [showMqttVersionMenu, setShowMqttVersionMenu] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLastWill, setShowLastWill] = useState(!!formData.lastWillTopic);

  const protocols = [
    { value: 'ws', label: 'WebSocket (ws://)' },
    { value: 'wss', label: 'WebSocket Secure (wss://)' },
    { value: 'mqtt', label: 'MQTT (mqtt://)' },
    { value: 'mqtts', label: 'MQTT Secure (mqtts://)' },
  ];

  const mqttVersions = [
    { value: '3.1.1', label: 'MQTT 3.1.1' },
    { value: '5.0', label: 'MQTT 5.0' },
  ];

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
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Configuration name is required';
    }
    
    if (!formData.host.trim()) {
      newErrors.host = 'Máy chủ là bắt buộc';
    }
    
    const port = parseInt(formData.port);
    if (!port || port < 1 || port > 65535) {
      newErrors.port = 'Số cổng hợp lệ (1-65535) là bắt buộc';
    }

    if (!formData.clientId.trim()) {
      newErrors.clientId = 'Client ID là bắt buộc';
    }

    const connectTimeout = parseInt(formData.connectTimeout);
    if (!connectTimeout || connectTimeout < 1 || connectTimeout > 300) {
      newErrors.connectTimeout = 'Thời gian chờ kết nối phải từ 1-300 giây';
    }

    const keepAlive = parseInt(formData.keepAlive);
    if (!keepAlive || keepAlive < 1 || keepAlive > 3600) {
      newErrors.keepAlive = 'Keep alive phải từ 1-3600 giây';
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
        connectTimeout: parseInt(formData.connectTimeout) * 1000,
        keepAlive: parseInt(formData.keepAlive),
      };

      const result = await testConnection(testData);
      if (result.success) {
        setSnackbarMessage('Kiểm tra kết nối thành công!');
        setShowSnackbar(true);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setSnackbarMessage(error.message || 'Kiểm tra kết nối thất bại');
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

    setLoading(true);
    
    try {
      const configData = {
        ...formData,
        port: parseInt(formData.port),
        connectTimeout: parseInt(formData.connectTimeout) * 1000,
        keepAlive: parseInt(formData.keepAlive),
        reconnectPeriod: parseInt(formData.reconnectPeriod),
        sessionExpiryInterval: parseInt(formData.sessionExpiryInterval),
        receiveMaximum: parseInt(formData.receiveMaximum),
        maximumPacketSize: parseInt(formData.maximumPacketSize),
        topicAliasMaximum: parseInt(formData.topicAliasMaximum),
        lastWillDelayInterval: parseInt(formData.lastWillDelayInterval),
        lastWillMessageExpiryInterval: parseInt(formData.lastWillMessageExpiryInterval),
        lastWillQos: parseInt(formData.lastWillQos),
      };

      await updateConfig(config._id, configData);
      setSnackbarMessage('Cấu hình đã được cập nhật thành công!');
      setShowSnackbar(true);
      
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Update error:', error);
      setSnackbarMessage(`Không thể cập nhật: ${error.message}`);
      setShowSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const generateNewClientId = () => {
    const newClientId = `mqttx_${Math.random().toString(16).substr(2, 8)}`;
    handleInputChange('clientId', newClientId);
    setSnackbarMessage('Đã tạo Client ID mới');
    setShowSnackbar(true);
  };

  const selectedProtocol = protocols.find(p => p.value === formData.protocol);
  const selectedMqttVersion = mqttVersions.find(v => v.value === formData.mqttVersion);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Snackbar positioned at top */}
      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={3000}
        style={styles.snackbarTop}
        wrapperStyle={styles.snackbarWrapper}
      >
        <Text style={styles.snackbarText}>{snackbarMessage}</Text>
      </Snackbar>
      
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
              <Text style={styles.headerTitle}>Edit Garden Network</Text>
              <Text style={styles.headerSubtitle}>Update your MQTT broker settings</Text>
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
              {/* Basic Configuration */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🌱 Cấu hình cơ bản</Text>
                
                <TextInput
                  label="Tên mạng"
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  error={!!errors.name}
                  style={styles.input}
                  placeholder="Mạng vườn của tôi"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  left={<TextInput.Icon icon="leaf" color="#8BC34A" />}
                  theme={INPUT_THEME}
                  textColor="#FFFFFF"
                />
                <HelperText type="error" visible={!!errors.name} style={styles.errorText}>
                  {errors.name}
                </HelperText>

                <TextInput
                  label="Máy chủ Broker"
                  value={formData.host}
                  onChangeText={(value) => handleInputChange('host', value)}
                  error={!!errors.host}
                  style={styles.input}
                  placeholder="broker.hivemq.com"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  left={<TextInput.Icon icon="server" color="#8BC34A" />}
                  autoCapitalize="none"
                  theme={INPUT_THEME}
                  textColor="#FFFFFF"
                />
                <HelperText type="error" visible={!!errors.host} style={styles.errorText}>
                  {errors.host}
                </HelperText>

                <TextInput
                  label="Cổng"
                  value={formData.port}
                  onChangeText={(value) => handleInputChange('port', value)}
                  error={!!errors.port}
                  style={styles.input}
                  placeholder="1883"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  left={<TextInput.Icon icon="ethernet" color="#8BC34A" />}
                  keyboardType="numeric"
                  theme={INPUT_THEME}
                  textColor="#FFFFFF"
                />
                <HelperText type="error" visible={!!errors.port} style={styles.errorText}>
                  {errors.port}
                </HelperText>

                <Menu
                  visible={showProtocolMenu}
                  onDismiss={() => setShowProtocolMenu(false)}
                  anchor={
                    <TouchableOpacity
                      onPress={() => setShowProtocolMenu(true)}
                      style={styles.menuButton}
                    >
                      <View style={styles.menuButtonContent}>
                        <Ionicons name="layers" size={20} color="#8BC34A" />
                        <Text style={styles.menuButtonText}>
                          {selectedProtocol?.label || 'Select Protocol'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="rgba(255, 255, 255, 0.7)" />
                      </View>
                    </TouchableOpacity>
                  }
                  contentStyle={styles.menuContent}
                >
                  {protocols.map((protocol) => (
                    <Menu.Item
                      key={protocol.value}
                      onPress={() => {
                        handleInputChange('protocol', protocol.value);
                        setShowProtocolMenu(false);
                      }}
                      title={protocol.label}
                      titleStyle={{ color: '#333' }}
                    />
                  ))}
                </Menu>

                {(formData.protocol === 'ws' || formData.protocol === 'wss') && (
                  <TextInput
                    label="Đường dẫn"
                    value={formData.path}
                    onChangeText={(value) => handleInputChange('path', value)}
                    style={styles.input}
                    placeholder="/mqtt"
                    placeholderTextColor="rgba(255, 255, 255, 0.7)"
                    left={<TextInput.Icon icon="folder" color="#8BC34A" />}
                    theme={INPUT_THEME}
                    textColor="#FFFFFF"
                  />
                )}

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Đặt làm mạng mặc định</Text>
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
                <Text style={styles.sectionTitle}>🔐 Xác thực</Text>
                
                <TextInput
                  label="Tên người dùng"
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  style={styles.input}
                  placeholder="Nhập tên người dùng"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  left={<TextInput.Icon icon="account" color="#8BC34A" />}
                  theme={INPUT_THEME}
                  textColor="#FFFFFF"
                />

                <TextInput
                  label="Mật khẩu"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  style={styles.input}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  secureTextEntry
                  left={<TextInput.Icon icon="lock" color="#8BC34A" />}
                  theme={INPUT_THEME}
                  textColor="#FFFFFF"
                />
              </View>

              {/* Advanced Settings */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚙️ Cài đặt nâng cao</Text>
                
                <View style={styles.clientIdRow}>
                  <TextInput
                    label="ID máy khách"
                    value={formData.clientId}
                    onChangeText={(value) => handleInputChange('clientId', value)}
                    error={!!errors.clientId}
                    style={[styles.input, styles.clientIdInput]}
                    placeholder="Mã định danh duy nhất"
                    placeholderTextColor="rgba(255, 255, 255, 0.7)"
                    left={<TextInput.Icon icon="identifier" color="#8BC34A" />}
                    theme={INPUT_THEME}
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
                      <Text style={styles.generateButtonText}>Tạo mới</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <HelperText type="error" visible={!!errors.clientId} style={styles.errorText}>
                  {errors.clientId}
                </HelperText>

                <View style={styles.advancedRow}>
                  <TextInput
                    label="Duy trì kết nối (giây)"
                    value={formData.keepAlive}
                    onChangeText={(value) => handleInputChange('keepAlive', value)}
                    error={!!errors.keepAlive}
                    style={[styles.input, styles.halfInput]}
                    placeholder="60"
                    placeholderTextColor="rgba(255, 255, 255, 0.7)"
                    keyboardType="numeric"
                    theme={INPUT_THEME}
                    textColor="#FFFFFF"
                  />
                  <TextInput
                    label="Thời gian chờ kết nối (giây)"
                    value={formData.connectTimeout}
                    onChangeText={(value) => handleInputChange('connectTimeout', value)}
                    error={!!errors.connectTimeout}
                    style={[styles.input, styles.halfInput]}
                    placeholder="10"
                    placeholderTextColor="rgba(255, 255, 255, 0.7)"
                    keyboardType="numeric"
                    theme={INPUT_THEME}
                    textColor="#FFFFFF"
                  />
                </View>
                <HelperText type="error" visible={!!errors.keepAlive} style={styles.errorText}>
                  {errors.keepAlive}
                </HelperText>
                <HelperText type="error" visible={!!errors.connectTimeout} style={styles.errorText}>
                  {errors.connectTimeout}
                </HelperText>

                <TextInput
                  label="Chu kỳ kết nối lại (ms)"
                  value={formData.reconnectPeriod}
                  onChangeText={(value) => handleInputChange('reconnectPeriod', value)}
                  style={styles.input}
                  placeholder="4000"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  keyboardType="numeric"
                  theme={INPUT_THEME}
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
                  <Text style={styles.switchLabel}>Bắt đầu sạch</Text>
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
                  <Text style={styles.sectionTitle}>🔗 Thông điệp cuối cùng</Text>
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
                      label="Chủ đề di chúc"
                      value={formData.lastWillTopic}
                      onChangeText={(value) => handleInputChange('lastWillTopic', value)}
                      style={styles.input}
                      placeholder="device/status"
                      placeholderTextColor="rgba(255, 255, 255, 0.7)"
                      theme={INPUT_THEME}
                      textColor="#FFFFFF"
                    />

                    <TextInput
                      label="Tin nhắn di chúc"
                      value={formData.lastWillPayload}
                      onChangeText={(value) => handleInputChange('lastWillPayload', value)}
                      style={styles.input}
                      placeholder="offline"
                      placeholderTextColor="rgba(255, 255, 255, 0.7)"
                      theme={INPUT_THEME}
                      textColor="#FFFFFF"
                    />

                    <View style={styles.willRow}>
                      <TextInput
                        label="QoS"
                        value={formData.lastWillQos}
                        onChangeText={(value) => handleInputChange('lastWillQos', value)}
                        style={[styles.input, styles.halfInput]}
                        placeholder="0"
                        placeholderTextColor="rgba(255, 255, 255, 0.7)"
                        keyboardType="numeric"
                        theme={INPUT_THEME}
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
                    disabled={loading || testing}
                    style={[styles.testButton, { flex: 1, marginRight: 8 }]}
                  >
                    <LinearGradient
                      colors={['rgba(139, 195, 74, 0.8)', 'rgba(104, 159, 56, 0.8)']}
                      style={styles.testButtonGradient}
                    >
                      {testing ? (
                        <>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.buttonText}> Testing...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="wifi" size={16} color="#FFFFFF" />
                          <Text style={styles.buttonText}> Kiểm tra kết nối</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('MqttTest', { config })}
                    disabled={!formData.host || !formData.port}
                    style={[styles.testButton, { flex: 1, marginLeft: 8 }]}
                  >
                    <LinearGradient
                      colors={['rgba(139, 195, 74, 0.8)', 'rgba(104, 159, 56, 0.8)']}
                      style={styles.testButtonGradient}
                    >
                      <Ionicons name="flask" size={16} color="#FFFFFF" />
                      <Text style={styles.buttonText}> Full Test</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={loading}
                  style={styles.saveButton}
                >
                  <LinearGradient
                    colors={['#8BC34A', '#689F38']}
                    style={styles.saveButtonGradient}
                  >
                    {loading ? (
                      <>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.saveButtonText}> Đang cập nhật...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="save" size={20} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}> Cập nhật cấu hình</Text>
                      </>
                    )}
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
    paddingVertical: 8,
    paddingTop: 12,
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
    marginHorizontal: 12,
  },
  headerRight: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 1,
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
  menuButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 8,
  },
  menuButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
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
  // Top positioned snackbar styles
  snackbarWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  snackbarTop: {
    backgroundColor: 'rgba(139, 195, 74, 0.95)',
    marginTop: Platform.OS === 'ios' ? 50 : 40,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  snackbarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#FFB3B3',
    fontSize: 12,
  },
});

export default EditMqttConfigScreen;
