import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Vibration,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {
  Title,
  TextInput,
  Button,
  Text,
  Snackbar,
  Chip,
  ActivityIndicator,
  Divider,
  List,
  IconButton,
  Surface,
  Badge,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AuthContext from '../../context/AuthContext';
import { useMqtt } from '../../context/MqttContext';
import apiService from '../../services/api';
import { COLORS } from '../../constants';
import ModernCard from '../../components/ModernCard';

const MqttTestScreen = (props) => {
  const { navigation } = props || {};
  const { user } = useContext(AuthContext);
  const { configs, currentConfig, mqttStatus } = useMqtt();

  // Early return if critical dependencies are missing
  if (!user || !configs) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#4C533E" />
        <LinearGradient
          colors={['#767E67', '#4C533E', '#3C3C40', '#3C3C40']}
          style={styles.container}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8BC34A" />
            <Text style={styles.loadingText}>Đang tải kiểm tra MQTT...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const [selectedConfig, setSelectedConfig] = useState(currentConfig || null);
  const [testTopic, setTestTopic] = useState('test/mqtt-dashboard');
  const [testMessage, setTestMessage] = useState('Xin chào từ Bảng điều khiển MQTT!');
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState([]);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('info');
  const [animatedValue] = useState(new Animated.Value(0));

  // Auto-select first config if no current config
  useEffect(() => {
    if (!selectedConfig && configs.length > 0) {
      setSelectedConfig(configs[0]);
    }
  }, [configs, selectedConfig]);

  const addResult = (type, message, success = true) => {
    const timestamp = new Date().toLocaleTimeString();
    setResults(prev => {
      const newId = `result-${prev.length + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newResult = {
        id: newId,
        type: type || 'info',
        message: message || 'No message',
        success: success !== false,
        timestamp,
        animatedValue: new Animated.Value(0)
      };
      
      // Animate in new result
      Animated.spring(newResult.animatedValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      }).start();
      
      // Add haptic feedback for success/error
      if (type === 'success') {
        Vibration.vibrate(50); // Short vibration for success
      } else if (type === 'error') {
        Vibration.vibrate([0, 100, 50, 100]); // Pattern for error
      }
      
      return [...prev, newResult];
    });
  };

  // Helper function to show snackbar with type
  const showSnackbarWithType = (message, type = 'info') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setShowSnackbar(true);
    
    // Add haptic feedback
    if (type === 'success') {
      Vibration.vibrate(50);
    } else if (type === 'error') {
      Vibration.vibrate([0, 100, 50, 100]);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  // Simple function to send MQTT message
  const sendMqttMessage = async () => {
    if (!selectedConfig) {
      showSnackbarWithType('Vui lòng chọn MQTT configuration trước', 'error');
      return;
    }

    if (!testTopic.trim()) {
      showSnackbarWithType('Vui lòng nhập topic', 'error');
      return;
    }

    if (!testMessage.trim()) {
      showSnackbarWithType('Vui lòng nhập message', 'error');
      return;
    }

    setPublishing(true);
    
    try {
      addResult('info', `🚀 Đang gửi message đến topic: ${testTopic}`, true);
      
      const publishData = {
        host: selectedConfig.host,
        port: selectedConfig.port,
        protocol: selectedConfig.protocol,
        path: selectedConfig.path,
        username: selectedConfig.username,
        password: selectedConfig.password,
        clientId: selectedConfig.clientId || `test_${Date.now()}`,
        mqttVersion: selectedConfig.mqttVersion || '5.0',
        useSSL: selectedConfig.useSSL || false,
        connectTimeout: selectedConfig.connectTimeout || 30000,
        keepAlive: selectedConfig.keepAlive || 60,
        testTopic: testTopic.trim(),
        testMessage: testMessage.trim()
      };

      console.log('📤 Publishing MQTT message:', publishData);
      
      const result = await apiService.testMqttPublish(publishData);
      
      if (result.success) {
        addResult('success', `✅ Message đã gửi thành công!`, true);
        addResult('message', `📨 Topic: ${testTopic}`, true);
        addResult('message', `💬 Message: ${testMessage}`, true);
        showSnackbarWithType('🎉 Message đã được gửi thành công!', 'success');
      } else {
        addResult('error', `❌ Gửi message thất bại: ${result.message}`, false);
        showSnackbarWithType('❌ Gửi message thất bại!', 'error');
      }
    } catch (error) {
      console.error('MQTT publish error:', error);
      addResult('error', `❌ Lỗi: ${error.message}`, false);
      showSnackbarWithType('⚠️ Có lỗi xảy ra khi gửi message!', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const getResultIcon = (type) => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'alert-circle';
      case 'warning': return 'alert';
      case 'message': return 'message';
      case 'info': return 'information';
      default: return 'circle';
    }
  };

  const getResultColor = (type) => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'warning': return '#FF9800';
      case 'message': return '#2196F3';
      case 'info': return '#607D8B';
      default: return '#757575';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4C533E" />
      <LinearGradient
        colors={['#767E67', '#4C533E', '#3C3C40', '#3C3C40']}
        style={styles.container}
      >
        {/* Custom Header with Back Button */}
        <View style={styles.customHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#8BC34A" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Kiểm tra MQTT</Text>
            <Text style={styles.headerSubtitle}>Kiểm tra việc gửi MQTT với cấu hình của bạn</Text>
          </View>
          
          <View style={styles.headerRight}>
            {results.length > 0 && (
              <TouchableOpacity
                onPress={clearResults}
                disabled={publishing}
                style={styles.clearButton}
              >
                <Ionicons name="refresh" size={20} color="#8BC34A" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Configuration Selection */}
          <ModernCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔧 Chọn MQTT Configuration</Text>
            </View>
            
            {configs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="settings-outline" size={60} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyText}>
                  Không tìm thấy MQTT configuration nào. Vui lòng tạo một cái trước.
                </Text>
              </View>
            ) : (
              <View style={styles.configList}>
                {configs.map((config) => (
                  <TouchableOpacity
                    key={config._id}
                    onPress={() => setSelectedConfig(config)}
                    style={[
                      styles.configItem,
                      selectedConfig?._id === config._id && styles.selectedConfig
                    ]}
                  >
                    <View style={styles.configItemContent}>
                      <View style={styles.configInfo}>
                        <Ionicons 
                          name={selectedConfig?._id === config._id ? 'radio-button-on' : 'radio-button-off'} 
                          size={20}
                          color={selectedConfig?._id === config._id ? '#8BC34A' : 'rgba(255, 255, 255, 0.7)'}
                        />
                        <View style={styles.configDetails}>
                          <Text style={styles.configName}>{config.name}</Text>
                          <Text style={styles.configDescription}>
                            {`${config.host}:${config.port} (${config.protocol})`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!selectedConfig && configs.length > 0 && (
              <Text style={styles.helperText}>
                Nhấn vào một configuration để chọn cho việc test
              </Text>
            )}
          </ModernCard>

        {/* Test Parameters */}
        {selectedConfig && (
          <ModernCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📊 Thông số kiểm tra</Text>
            </View>
              
            <TextInput
              mode="outlined"
              label="Topic"
              value={testTopic}
              onChangeText={setTestTopic}
              style={styles.input}
              placeholder="test/mqtt-dashboard"
              placeholderTextColor="rgba(255, 255, 255, 0.8)"
              left={<TextInput.Icon icon="message-outline" color="#8BC34A" />}
              theme={{
                colors: {
                  primary: '#8BC34A',
                  background: 'rgba(255, 255, 255, 0.1)',
                  onSurface: '#FFFFFF',
                  outline: 'rgba(139, 195, 74, 0.7)',
                  placeholder: 'rgba(255, 255, 255, 0.8)',
                  onSurfaceVariant: '#FFFFFF',
                }
              }}
              textColor="#FFFFFF"
            />

            <TextInput
              mode="outlined"
              label="Message"
              value={testMessage}
              onChangeText={setTestMessage}
              style={styles.input}
              placeholder="Xin chào từ Bảng điều khiển MQTT!"
              placeholderTextColor="rgba(255, 255, 255, 0.8)"
              multiline
              numberOfLines={2}
              left={<TextInput.Icon icon="message-text" color="#8BC34A" />}
              theme={{
                colors: {
                  primary: '#8BC34A',
                  background: 'rgba(255, 255, 255, 0.1)',
                  onSurface: '#FFFFFF',
                  outline: 'rgba(139, 195, 74, 0.7)',
                  placeholder: 'rgba(255, 255, 255, 0.8)',
                  onSurfaceVariant: '#FFFFFF',
                }
              }}
              textColor="#FFFFFF"
            />
          </ModernCard>
        )}

        {/* Test Actions */}
        {selectedConfig && (
          <ModernCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🚀 Gửi Message</Text>
            </View>
              
            {/* Current Status */}
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <Chip 
                  icon="wifi" 
                  mode="flat"
                  style={[
                    styles.statusChip,
                    { backgroundColor: mqttStatus === 'connected' ? 'rgba(139, 195, 74, 0.2)' : 
                                       mqttStatus === 'connecting' ? 'rgba(255, 152, 0, 0.2)' :
                                       mqttStatus === 'error' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(255, 255, 255, 0.2)' }
                  ]}
                  textStyle={{ 
                    color: mqttStatus === 'connected' ? '#8BC34A' : 
                           mqttStatus === 'connecting' ? '#FF9800' :
                           mqttStatus === 'error' ? '#F44336' : 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  MQTT: {mqttStatus === 'connected' ? 'Đã kết nối' : 
                         mqttStatus === 'connecting' ? 'Đang kết nối...' :
                         mqttStatus === 'error' ? 'Lỗi kết nối' : 'Chưa kết nối'}
                </Chip>
                
                {selectedConfig && (
                  <Chip 
                    icon="saw-blade"
                    mode="outlined"
                    style={styles.configChip}
                    textStyle={{ fontSize: 12, color: '#8BC34A' }}
                  >
                    {selectedConfig.name}
                  </Chip>
                )}
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={sendMqttMessage}
                disabled={publishing}
                style={styles.sendButton}
                buttonColor="#8BC34A"
                textColor="#FFFFFF"
                icon="send"
                loading={publishing}
              >
                {publishing ? 'Đang gửi...' : 'Gửi Message'}
              </Button>

              {results.length > 0 && (
                <Button
                  mode="text"
                  onPress={clearResults}
                  disabled={publishing}
                  style={styles.clearButton}
                  textColor="#8BC34A"
                  icon="trash-can"
                >
                  Xóa kết quả
                </Button>
              )}
            </View>
          </ModernCard>
        )}

        {/* Test Results */}
        {results.length > 0 && (
          <ModernCard style={styles.section}>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>📋 Kết quả</Text>
              <Badge size={24} style={styles.resultsBadge}>
                {results.length}
              </Badge>
            </View>
            
            <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
              {results.map((result, index) => (
                <Animated.View
                  key={result.id}
                  style={[
                    styles.resultItem,
                    {
                      transform: [
                        {
                          translateY: result.animatedValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0],
                          }),
                        },
                        {
                          scale: result.animatedValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                      opacity: result.animatedValue,
                    },
                  ]}
                >
                  <Surface style={[
                    styles.resultSurface,
                    { borderLeftColor: getResultColor(result.type) }
                  ]}>
                    <View style={styles.resultHeader}>
                      <View style={[
                        styles.resultIconContainer,
                        { backgroundColor: getResultColor(result.type) + '20' }
                      ]}>
                        <IconButton
                          icon={getResultIcon(result.type)}
                          size={18}
                          iconColor={getResultColor(result.type)}
                          style={styles.resultIcon}
                        />
                      </View>
                      <View style={styles.resultContent}>
                        <Text style={styles.resultMessage}>{result.message}</Text>
                        <View style={styles.resultFooter}>
                          <Text style={styles.resultTimestamp}>
                            {result.timestamp || new Date().toLocaleTimeString()}
                          </Text>
                          <Chip 
                            mode="outlined" 
                            compact
                            style={[
                              styles.resultTypeChip,
                              { borderColor: getResultColor(result.type) }
                            ]}
                            textStyle={{ 
                              color: getResultColor(result.type),
                              fontSize: 10
                            }}
                          >
                            {result.type}
                          </Chip>
                        </View>
                      </View>
                    </View>
                  </Surface>
                </Animated.View>
              ))}
            </ScrollView>
          </ModernCard>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={3000}
        style={[
          styles.snackbar,
          {
            backgroundColor: snackbarType === 'success' ? '#4CAF50' : 
                            snackbarType === 'error' ? '#F44336' : '#2196F3'
          }
        ]}
        action={{
          label: '✖',
          onPress: () => setShowSnackbar(false),
          textColor: 'white'
        }}
      >
        <Text style={styles.snackbarText}>
          {snackbarMessage}
        </Text>
      </Snackbar>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#4C533E',
  },
  container: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
    alignItems: 'flex-end',
  },
  clearButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
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
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  configList: {
    gap: 8,
  },
  configItem: {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  selectedConfig: {
    backgroundColor: 'rgba(139, 195, 74, 0.25)',
    borderColor: '#8BC34A',
    borderWidth: 2,
  },
  configItemContent: {
    padding: 16,
  },
  configInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configDetails: {
    flex: 1,
    marginLeft: 12,
  },
  configName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  configDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  helperText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  input: {
    marginBottom: 16,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  configChip: {
    alignSelf: 'flex-start',
    borderColor: 'rgba(139, 195, 74, 0.5)',
  },
  buttonContainer: {
    gap: 12,
  },
  sendButton: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsBadge: {
    backgroundColor: '#8BC34A',
  },
  resultsContainer: {
    maxHeight: 400,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultItem: {
    marginBottom: 12,
  },
  resultSurface: {
    borderRadius: 12,
    borderLeftWidth: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
  },
  resultIconContainer: {
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultIcon: {
    margin: 0,
    padding: 0,
  },
  resultContent: {
    flex: 1,
  },
  resultMessage: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 8,
    color: '#FFFFFF',
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTimestamp: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  resultTypeChip: {
    height: 20,
    borderWidth: 1,
  },
  bottomSpacing: {
    height: 40,
  },
  snackbar: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  snackbarText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default MqttTestScreen;
