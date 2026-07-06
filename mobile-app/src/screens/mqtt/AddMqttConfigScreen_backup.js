import React, { useState, useContext } from 'react';
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
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AuthContext from '../../context/AuthContext';
import { useMqtt } from '../../context/MqttContext';
import { apiService } from '../../services/api';
import { generateClientId, validateMqttConfig } from '../../utils';
import { COLORS } from '../../constants';

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
      newErrors.port = 'Port must be between 1 and 65535';
    }

    if (formData.lastWillTopic && !formData.lastWillTopic.trim()) {
      newErrors.lastWillTopic = 'Will topic is required when will is enabled';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) {
      setSnackbarMessage('Please fix the validation errors');
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
      setSnackbarMessage(error.message || 'Kiểm tra kết nối thất bại');
      setShowSnackbar(true);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setSnackbarMessage('Please fix the validation errors');
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
      setSnackbarMessage('Configuration saved successfully!');
      setShowSnackbar(true);
      
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      setSnackbarMessage('Failed to save configuration');
      setShowSnackbar(true);
    }
  };

  const generateNewClientId = () => {
    const newClientId = generateClientId();
    handleInputChange('clientId', newClientId);
    setSnackbarMessage('New Client ID generated');
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
              <Text style={styles.headerTitle}>Add Garden Network</Text>
              <Text style={styles.headerSubtitle}>Connect to your MQTT broker</Text>
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
                <Text style={styles.sectionTitle}>🌱 Basic Configuration</Text>
                
                <TextInput
                  label="Tên mạng"
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  error={!!errors.name}
                  style={styles.input}
                  placeholder="My Garden Network"
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
                  label="Port"
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
                  label="Protocol"
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
                  <Text style={styles.switchLabel}>Set as default network</Text>
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
                <Text style={styles.sectionTitle}>🔐 Authentication (Optional)</Text>
                
                <TextInput
                  label="Username"
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
                  label="Password"
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
                <Text style={styles.sectionTitle}>⚙️ Advanced Settings</Text>
                
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
                      <Text style={styles.generateButtonText}>Generate</Text>
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
                    label="Connect Timeout (s)"
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
                  label="Reconnect Period (ms)"
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
                  <Text style={styles.switchLabel}>Auto Reconnect</Text>
                  <Switch
                    value={formData.autoReconnect}
                    onValueChange={(value) => handleInputChange('autoReconnect', value)}
                    thumbColor={formData.autoReconnect ? '#8BC34A' : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: 'rgba(139, 195, 74, 0.3)' }}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Clean Start</Text>
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
                          <Text style={styles.buttonText}> Testing...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="wifi" size={16} color="#FFFFFF" />
                          <Text style={styles.buttonText}> Quick Test</Text>
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
                      <Text style={styles.buttonText}> Full Test</Text>
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
                    <Text style={styles.saveButtonText}> Save Configuration</Text>
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
});

export default AddMqttConfigScreen;
