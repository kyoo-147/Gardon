import React, { useState, useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  TextInput, 
  Button, 
  Chip,
  HelperText,
  Menu,
  Divider
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthContext from '../../context/AuthContext';
import { useMqtt } from '../../context/MqttContext';
import { API_ENDPOINTS, COLORS } from '../../constants';
import ModernCard from '../../components/ModernCard';

const DEVICE_TYPES = [
  { value: 'light', label: 'Đèn vườn', icon: 'lightbulb' },
  { value: 'switch', label: 'Công tắc thông minh', icon: 'toggle-switch' },
  { value: 'sensor', label: 'Cảm biến đất', icon: 'water' },
  { value: 'fan', label: 'Quạt thông gió', icon: 'fan' },
  { value: 'camera', label: 'Camera vườn', icon: 'camera' },
  { value: 'door', label: 'Cửa nhà kính', icon: 'door' },
  { value: 'thermostat', label: 'Điều khiển khí hậu', icon: 'thermostat' },
  { value: 'irrigation', label: 'Hệ thống tưới', icon: 'water-pump' },
  { value: 'other', label: 'Khác', icon: 'leaf' }
];

const AddDeviceScreen = ({ navigation }) => {
  const { token } = useContext(AuthContext);
  const { configs: mqttConfigs } = useMqtt();
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    topic: '',
    mqttConfigId: '',
    description: '',
    room: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showConfigMenu, setShowConfigMenu] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Yêu cầu tên thiết bị';
    }
    
    if (!formData.type) {
      newErrors.type = 'Yêu cầu loại thiết bị';
    }
    
    if (!formData.topic.trim()) {
      newErrors.topic = 'Yêu cầu MQTT topic';
    } else if (!/^[a-zA-Z0-9/_-]+$/.test(formData.topic)) {
      newErrors.topic = 'Định dạng topic không hợp lệ. Chỉ sử dụng chữ cái, số, /, _, và -';
    }
    
    if (!formData.mqttConfigId) {
      newErrors.mqttConfigId = 'Yêu cầu cấu hình MQTT';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(API_ENDPOINTS.DEVICES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Thành công', 'Thiết bị đã được thêm thành công!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        throw new Error(data.message || 'Không thể thêm thiết bị');
      }
    } catch (error) {
      Alert.alert('Lỗi', error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedType = DEVICE_TYPES.find(type => type.value === formData.type) || null;
  const selectedConfig = mqttConfigs?.find(config => config._id === formData.mqttConfigId) || null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <ModernCard>
            <View style={styles.header}>
              <Text style={styles.title}>Thêm thiết bị vườn</Text>
              <Text style={styles.subtitle}>Kết nối thiết bị mới với mạng lưới Gardon của bạn</Text>
            </View>
              
            <TextInput
              label="Tên thiết bị"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              style={styles.input}
              error={!!errors.name}
              left={<TextInput.Icon icon="leaf" color={COLORS.primary} />}
              theme={{ colors: { primary: COLORS.primary } }}
            />
            <HelperText type="error" visible={!!errors.name}>
              {errors.name}
            </HelperText>

            <Menu
              visible={showTypeMenu}
              onDismiss={() => setShowTypeMenu(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setShowTypeMenu(true)}
                  style={[styles.dropdownButton]}
                  contentStyle={{ justifyContent: 'flex-start', paddingVertical: 12 }}
                  icon={selectedType?.icon || 'chevron-down'}
                  theme={{ colors: { outline: COLORS.primary } }}
                >
                  {selectedType?.label || 'Chọn loại thiết bị'}
                </Button>
              }
            >
              {DEVICE_TYPES.map((type) => (
                <Menu.Item
                  key={type.value}
                  leadingIcon={type.icon}
                  onPress={() => {
                    setFormData({ ...formData, type: type.value });
                    setShowTypeMenu(false);
                  }}
                  title={type.label}
                />
              ))}
            </Menu>
            <HelperText type="error" visible={!!errors.type}>
              {errors.type}
            </HelperText>

            <TextInput
              label="Topic thiết bị"
              value={formData.topic}
              onChangeText={(text) => setFormData({ ...formData, topic: text })}
              style={styles.input}
              error={!!errors.topic}
              left={<TextInput.Icon icon="message-outline" color={COLORS.primary} />}
              placeholder="ví dụ: vuon/nha-kinh/cam-bien/dat"
              theme={{ colors: { primary: COLORS.primary } }}
            />
            <HelperText type="error" visible={!!errors.topic}>
              {errors.topic}
            </HelperText>

            <Menu
              visible={showConfigMenu}
              onDismiss={() => setShowConfigMenu(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setShowConfigMenu(true)}
                  style={[styles.dropdownButton]}
                  contentStyle={{ justifyContent: 'flex-start', paddingVertical: 12 }}
                  icon="server"
                  theme={{ colors: { outline: COLORS.primary } }}
                >
                  {selectedConfig?.name || 'Chọn mạng lưới Gardon'}
                </Button>
              }
            >
              {mqttConfigs && mqttConfigs.map((config) => (
                <Menu.Item
                  key={config._id}
                  leadingIcon="server"
                  onPress={() => {
                    setFormData({ ...formData, mqttConfigId: config._id });
                    setShowConfigMenu(false);
                  }}
                  title={config.name}
                />
              ))}
              {(!mqttConfigs || mqttConfigs.length === 0) && (
                <Menu.Item
                  title="Mạng lưới Gardon không khả dụng"
                  disabled
                />
              )}
            </Menu>
            <HelperText type="error" visible={!!errors.mqttConfigId}>
              {errors.mqttConfigId}
            </HelperText>

            <TextInput
              label="Vị trí (Tùy chọn)"
              value={formData.room}
              onChangeText={(text) => setFormData({ ...formData, room: text })}
              style={styles.input}
              left={<TextInput.Icon icon="map-marker-outline" color={COLORS.primary} />}
              placeholder="Ví dụ: Nhà kính, Vườn ngoài trời, Ban công"
              theme={{ colors: { primary: COLORS.primary } }}
            />

            <TextInput
              label="Mô tả (Tùy chọn)"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              style={styles.input}
              multiline
              numberOfLines={3}
              left={<TextInput.Icon icon="text" color={COLORS.primary} />}
              placeholder="Mô tả mục đích của thiết bị này..."
              theme={{ colors: { primary: COLORS.primary } }}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              icon="plus"
              buttonColor={COLORS.primary}
              contentStyle={{ paddingVertical: 8 }}
            >
              Thêm vào Gardon
            </Button>
          </ModernCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  dropdownButton: {
    marginBottom: 8,
    borderRadius: 4,
    borderColor: COLORS.primary,
    justifyContent: 'flex-start',
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 16,
  },
});

export default AddDeviceScreen;
