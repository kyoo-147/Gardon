import React, { useState, useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  TextInput, 
  Button, 
  Switch,
  HelperText,
  Divider
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../constants';

const EditMqttConfigScreen = ({ route, navigation }) => {
  const { config } = route.params;
  const { token } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    name: config.name || '',
    host: config.host || '',
    port: config.port?.toString() || '8083',
    protocol: config.protocol || 'ws',
    path: config.path || '/mqtt',
    username: config.username || '',
    password: config.password || '',
    clientId: config.clientId || '',
    mqttVersion: config.mqttVersion || '5.0',
    connectTimeout: (config.connectTimeout / 1000)?.toString() || '10',
    keepAlive: config.keepAlive?.toString() || '60',
    autoReconnect: config.autoReconnect ?? true,
    reconnectPeriod: config.reconnectPeriod?.toString() || '4000',
    cleanStart: config.cleanStart ?? true,
    useSSL: config.useSSL || false,
    description: config.description || ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Configuration name is required';
    }
    
    if (!formData.host.trim()) {
      newErrors.host = 'Host is required';
    }
    
    const port = parseInt(formData.port);
    if (!port || port < 1 || port > 65535) {
      newErrors.port = 'Valid port number (1-65535) is required';
    }
    
    const keepAlive = parseInt(formData.keepAlive);
    if (!keepAlive || keepAlive < 10 || keepAlive > 3600) {
      newErrors.keepAlive = 'Keep alive must be between 10-3600 seconds';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        port: parseInt(formData.port),
        keepAlive: parseInt(formData.keepAlive),
        connectTimeout: parseInt(formData.connectTimeout) * 1000,
        reconnectPeriod: parseInt(formData.reconnectPeriod)
      };
      
      const response = await fetch(`${API_ENDPOINTS.MQTT_CONFIGS}/${config._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Success', 'MQTT configuration updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        throw new Error(data.message || 'Failed to update MQTT configuration');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.title}>Edit MQTT Configuration</Text>
              
              <TextInput
                label="Configuration Name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                style={styles.input}
                error={!!errors.name}
                left={<TextInput.Icon icon="tag" />}
              />
              <HelperText type="error" visible={!!errors.name}>
                {errors.name}
              </HelperText>

              <Divider style={styles.divider} />
              <Text style={styles.sectionTitle}>Connection Settings</Text>

              <TextInput
                label="Host"
                value={formData.host}
                onChangeText={(text) => setFormData({ ...formData, host: text })}
                style={styles.input}
                error={!!errors.host}
                left={<TextInput.Icon icon="server" />}
                placeholder="broker.emqx.io"
              />
              <HelperText type="error" visible={!!errors.host}>
                {errors.host}
              </HelperText>

              <TextInput
                label="Port"
                value={formData.port}
                onChangeText={(text) => setFormData({ ...formData, port: text })}
                style={styles.input}
                error={!!errors.port}
                keyboardType="numeric"
                left={<TextInput.Icon icon="network" />}
              />
              <HelperText type="error" visible={!!errors.port}>
                {errors.port}
              </HelperText>

              <TextInput
                label="Protocol"
                value={formData.protocol}
                onChangeText={(text) => setFormData({ ...formData, protocol: text })}
                style={styles.input}
                left={<TextInput.Icon icon="protocol" />}
                placeholder="ws, wss, mqtt, mqtts"
              />

              <TextInput
                label="Path"
                value={formData.path}
                onChangeText={(text) => setFormData({ ...formData, path: text })}
                style={styles.input}
                left={<TextInput.Icon icon="file-tree" />}
                placeholder="/mqtt"
              />

              <View style={styles.switchContainer}>
                <View style={styles.switchLabel}>
                  <Text style={styles.switchText}>Use SSL/TLS</Text>
                  <Text style={styles.switchSubtext}>Enable secure connection</Text>
                </View>
                <Switch
                  value={formData.useSSL}
                  onValueChange={(value) => setFormData({ ...formData, useSSL: value })}
                />
              </View>

              <TextInput
                label="Keep Alive (seconds)"
                value={formData.keepAlive}
                onChangeText={(text) => setFormData({ ...formData, keepAlive: text })}
                style={styles.input}
                error={!!errors.keepAlive}
                keyboardType="numeric"
                left={<TextInput.Icon icon="timer" />}
              />
              <HelperText type="error" visible={!!errors.keepAlive}>
                {errors.keepAlive}
              </HelperText>

              <Divider style={styles.divider} />
              <Text style={styles.sectionTitle}>Authentication (Optional)</Text>

              <TextInput
                label="Username"
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                style={styles.input}
                left={<TextInput.Icon icon="account" />}
                autoCapitalize="none"
              />

              <TextInput
                label="Password"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                style={styles.input}
                secureTextEntry
                left={<TextInput.Icon icon="lock" />}
                autoCapitalize="none"
              />

              <Divider style={styles.divider} />
              <Text style={styles.sectionTitle}>Advanced Settings</Text>

              <TextInput
                label="Client ID"
                value={formData.clientId}
                onChangeText={(text) => setFormData({ ...formData, clientId: text })}
                style={styles.input}
                left={<TextInput.Icon icon="identifier" />}
                placeholder="Leave empty for auto-generated"
              />

              <TextInput
                label="MQTT Version"
                value={formData.mqttVersion}
                onChangeText={(text) => setFormData({ ...formData, mqttVersion: text })}
                style={styles.input}
                left={<TextInput.Icon icon="tag-outline" />}
                placeholder="5.0 or 3.1.1"
              />

              <TextInput
                label="Connect Timeout (seconds)"
                value={formData.connectTimeout}
                onChangeText={(text) => setFormData({ ...formData, connectTimeout: text })}
                style={styles.input}
                keyboardType="numeric"
                left={<TextInput.Icon icon="clock" />}
              />

              <TextInput
                label="Reconnect Period (ms)"
                value={formData.reconnectPeriod}
                onChangeText={(text) => setFormData({ ...formData, reconnectPeriod: text })}
                style={styles.input}
                keyboardType="numeric"
                left={<TextInput.Icon icon="refresh" />}
              />

              <View style={styles.switchContainer}>
                <View style={styles.switchLabel}>
                  <Text style={styles.switchText}>Auto Reconnect</Text>
                  <Text style={styles.switchSubtext}>Automatically reconnect on connection loss</Text>
                </View>
                <Switch
                  value={formData.autoReconnect}
                  onValueChange={(value) => setFormData({ ...formData, autoReconnect: value })}
                />
              </View>

              <View style={styles.switchContainer}>
                <View style={styles.switchLabel}>
                  <Text style={styles.switchText}>Clean Start</Text>
                  <Text style={styles.switchSubtext}>Start with a clean session</Text>
                </View>
                <Switch
                  value={formData.cleanStart}
                  onValueChange={(value) => setFormData({ ...formData, cleanStart: value })}
                />
              </View>

              <TextInput
                label="Description (Optional)"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                style={styles.input}
                multiline
                numberOfLines={3}
                left={<TextInput.Icon icon="text" />}
                placeholder="Configuration description..."
              />

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
                icon="check"
              >
                Update Configuration
              </Button>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1976D2',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
  divider: {
    marginVertical: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchLabel: {
    flex: 1,
  },
  switchText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  switchSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  submitButton: {
    marginTop: 20,
    paddingVertical: 8,
  },
});

export default EditMqttConfigScreen;
