import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  ActivityIndicator,
  IconButton,
  Chip
} from 'react-native-paper';
import { API_BASE_URL, SOCKET_URL, COLORS } from '../constants';
import { apiService } from '../services/api';

const ConnectionTestCard = ({ style }) => {
  const [apiStatus, setApiStatus] = useState('unknown');
  const [socketStatus, setSocketStatus] = useState('unknown');
  const [testing, setTesting] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);

  useEffect(() => {
    testConnections();
  }, []);

  const testConnections = async () => {
    setTesting(true);
    
    // Test API connection
    try {
      console.log('🔍 Testing API connection to:', API_BASE_URL);
      const response = await apiService.testConnection();
      setApiStatus('connected');
      setApiResponse(response);
      console.log('✅ API test successful');
    } catch (error) {
      setApiStatus('failed');
      console.error('❌ API test failed:', error.message);
    }

    // Test Socket connection
    try {
      console.log('🔍 Testing Socket connection to:', SOCKET_URL);
      // Basic socket test - we'll just check if the URL is reachable
      const socketUrl = new URL(SOCKET_URL);
      const testUrl = `${socketUrl.protocol}//${socketUrl.host}/socket.io/`;
      
      const response = await fetch(testUrl, { 
        method: 'GET',
        timeout: 5000
      });
      
      if (response.status === 200 || response.status === 400) {
        // 400 is normal for socket.io endpoint without proper headers
        setSocketStatus('connected');
        console.log('✅ Socket endpoint reachable');
      } else {
        setSocketStatus('failed');
        console.log('❌ Socket endpoint not reachable');
      }
    } catch (error) {
      setSocketStatus('failed');
      console.error('❌ Socket test failed:', error.message);
    }

    setTesting(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return '#4CAF50';
      case 'failed': return '#F44336';
      default: return '#FF9800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected': return 'Đã kết nối';
      case 'failed': return 'Thất bại';
      default: return 'Đang kiểm tra...';
    }
  };

  return (
    <Card style={[styles.card, style]}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={styles.title}>Connection Status</Text>
          <IconButton
            icon="refresh"
            onPress={testConnections}
            disabled={testing}
          />
        </View>

        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Text style={styles.label}>API Server:</Text>
            <View style={styles.statusInfo}>
              {testing ? (
                <ActivityIndicator size="small" />
              ) : (
                <Chip
                  mode="outlined"
                  textStyle={{ 
                    color: getStatusColor(apiStatus),
                    fontSize: 12 
                  }}
                  style={{ 
                    borderColor: getStatusColor(apiStatus) 
                  }}
                >
                  {getStatusText(apiStatus)}
                </Chip>
              )}
            </View>
          </View>

          <Text style={styles.endpoint}>{API_BASE_URL}</Text>

          <View style={styles.statusRow}>
            <Text style={styles.label}>Socket.IO:</Text>
            <View style={styles.statusInfo}>
              {testing ? (
                <ActivityIndicator size="small" />
              ) : (
                <Chip
                  mode="outlined"
                  textStyle={{ 
                    color: getStatusColor(socketStatus),
                    fontSize: 12 
                  }}
                  style={{ 
                    borderColor: getStatusColor(socketStatus) 
                  }}
                >
                  {getStatusText(socketStatus)}
                </Chip>
              )}
            </View>
          </View>

          <Text style={styles.endpoint}>{SOCKET_URL}</Text>

          {apiResponse && (
            <View style={styles.responseContainer}>
              <Text style={styles.responseTitle}>Server Response:</Text>
              <Text style={styles.responseText}>
                {apiResponse.service} - {apiResponse.status}
              </Text>
              <Text style={styles.responseText}>
                {new Date(apiResponse.timestamp).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        <Button
          mode="outlined"
          onPress={testConnections}
          loading={testing}
          disabled={testing}
          icon="wifi"
          style={styles.testButton}
        >
          Kiểm tra kết nối
        </Button>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  statusInfo: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  endpoint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  responseContainer: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  responseTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  responseText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  testButton: {
    marginTop: 8,
  },
});

export default ConnectionTestCard;
