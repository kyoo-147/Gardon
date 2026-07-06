import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
} from 'react-native';
import {
  Title,
  Paragraph,
  Button,
  Text,
  ActivityIndicator,
  Divider,
  IconButton,
} from 'react-native-paper';
import { apiService } from '../services/api';
import { COLORS } from '../constants';
import ModernCard from './ModernCard';

const MqttConnectionTester = ({ config, visible, onClose }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [currentStep, setCurrentStep] = useState('');

  const runFullTest = async () => {
    if (!config) return;

    setTesting(true);
    setTestResult(null);
    
    try {
      setCurrentStep('Testing connection...');
      
      const testData = {
        host: config.host?.trim(),
        port: parseInt(config.port),
        protocol: config.protocol,
        path: config.path,
        username: config.username?.trim() || undefined,
        password: config.password || undefined,
        clientId: config.clientId?.trim() || `test_${Date.now()}`,
        mqttVersion: config.mqttVersion,
        useSSL: config.useSSL,
        connectTimeout: parseInt(config.connectTimeout) * 1000 || 10000,
        keepAlive: parseInt(config.keepAlive) || 60,
      };

      const result = await apiService.testMqttConnection(testData);
      
      if (result.success) {
        setTestResult({
          success: true,
          message: '✅ Connection test successful!',
          details: `Đã kết nối tới ${testData.host}:${testData.port} sử dụng ${testData.protocol}`
        });
      } else {
        setTestResult({
          success: false,
          message: `❌ Connection failed: ${result.message}`,
          details: result.error || 'Kiểm tra cấu hình của bạn và thử lại'
        });
      }

    } catch (error) {
      console.error('Test error:', error);
      setTestResult({
        success: false,
        message: `❌ Test failed: ${error.message}`,
        details: 'Lỗi mạng hoặc cấu hình không hợp lệ'
      });
    } finally {
      setTesting(false);
      setCurrentStep('');
    }
  };

  const resetTest = () => {
    setTestResult(null);
    setCurrentStep('');
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <ModernCard style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.header}>
              <Title>MQTT Connection Tester</Title>
              <IconButton
                icon="close"
                size={24}
                onPress={onClose}
              />
            </View>

            <Paragraph style={styles.description}>
              Test your MQTT configuration with a real broker connection.
            </Paragraph>

            <ModernCard style={styles.configCard}>
              <View style={styles.cardContent}>
                <Text style={styles.configTitle}>Configuration:</Text>
                <Text style={styles.configText}>
                  Host: {config?.host}:{config?.port}
                </Text>
                <Text style={styles.configText}>
                  Protocol: {config?.protocol || 'mqtt'}
                </Text>
                <Text style={styles.configText}>
                  Client ID: {config?.clientId}
                </Text>
                {config?.username && (
                  <Text style={styles.configText}>
                    Username: {config.username}
                  </Text>
                )}
              </View>
            </ModernCard>

            <Divider style={styles.divider} />

            {testing && (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <Text style={styles.progressText}>{currentStep}</Text>
                <Text style={styles.progressSubtext}>Vui lòng đợi...</Text>
              </View>
            )}

            {testResult && (
              <ModernCard style={[styles.resultCard, testResult.success ? styles.successCard : styles.errorCard]}>
                <View style={styles.cardContent}>
                  <View style={styles.resultHeader}>
                    <IconButton
                      icon={testResult.success ? "check-circle" : "alert-circle"}
                      iconColor={testResult.success ? "#4CAF50" : "#F44336"}
                      size={24}
                    />
                    <Text style={styles.resultMessage}>{testResult.message}</Text>
                  </View>
                  
                  <Text style={styles.resultDetails}>{testResult.details}</Text>
                </View>
              </ModernCard>
            )}

            <View style={styles.buttonContainer}>
              {!testing && !testResult && (
                <Button
                  mode="contained"
                  onPress={runFullTest}
                  disabled={!config?.host || !config?.port}
                  style={styles.testButton}
                  icon="play"
                >
                  Start Test
                </Button>
              )}

              {!testing && testResult && (
                <View style={styles.buttonRow}>
                  <Button
                    mode="outlined"
                    onPress={resetTest}
                    style={[styles.actionButton, { marginRight: 8 }]}
                    icon="refresh"
                  >
                    Test Again
                  </Button>
                  <Button
                    mode="contained"
                    onPress={onClose}
                    style={styles.actionButton}
                    icon="check"
                  >
                    Done
                  </Button>
                </View>
              )}

              {testing && (
                <Button
                  mode="outlined"
                  onPress={() => {
                    setTesting(false);
                    setCurrentStep('');
                  }}
                  style={styles.cancelButton}
                >
                  Hủy
                </Button>
              )}
            </View>
          </View>
        </ModernCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  configCard: {
    marginBottom: 16,
  },
  configTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 16,
    color: '#FFFFFF',
  },
  configText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  progressText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  progressSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  resultCard: {
    marginBottom: 16,
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultMessage: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    color: '#FFFFFF',
  },
  resultDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 32,
  },
  buttonContainer: {
    marginTop: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  testButton: {
    marginVertical: 8,
  },
  actionButton: {
    flex: 1,
  },
  cancelButton: {
    marginVertical: 8,
  },
});

export default MqttConnectionTester;
