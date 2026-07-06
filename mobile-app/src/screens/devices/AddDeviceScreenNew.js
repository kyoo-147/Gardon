import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, StatusBar, TouchableOpacity } from 'react-native';
import { 
  Text, 
  Card, 
  TextInput, 
  Button, 
  Chip,
  HelperText,
  Menu,
  Divider,
  Switch,
  Slider,
  IconButton,
  List,
  Portal,
  Dialog,
  RadioButton,
  SegmentedButtons,
  Surface
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AuthContext from '../../context/AuthContext';
import { useMqtt } from '../../context/MqttContext';
import { COLORS } from '../../constants';
import ModernCard from '../../components/ModernCard';

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

// Widget types with their configurations
const WIDGET_TYPES = [
  { 
    value: 'button', 
    label: 'Nút bấm (BẬT/TẮT)', 
    icon: 'gesture-tap-button',
    description: 'Nút đơn giản cho lệnh nhị phân'
  },
  { 
    value: 'switch', 
    label: 'Công tắc', 
    icon: 'toggle-switch',
    description: 'Công tắc chuyển đổi với trạng thái BẬT/TẮT'
  },
  { 
    value: 'slider', 
    label: 'Điều khiển trượt', 
    icon: 'tune',
    description: 'Điều khiển giá trị liên tục (0-100)'
  },
  { 
    value: 'colorPicker', 
    label: 'Chọn màu', 
    icon: 'palette',
    description: 'Chọn màu RGB'
  },
  { 
    value: 'timePicker', 
    label: 'Chọn thời gian', 
    icon: 'clock-outline',
    description: 'Điều khiển chọn thời gian'
  },
  { 
    value: 'textInput', 
    label: 'Nhập văn bản', 
    icon: 'form-textbox',
    description: 'Nhập lệnh văn bản tùy chỉnh'
  },
  { 
    value: 'multiState', 
    label: 'Đa trạng thái', 
    icon: 'state-machine',
    description: 'Nhiều trạng thái được định nghĩa trước'
  },
  { 
    value: 'chart', 
    label: 'Hiển thị biểu đồ', 
    icon: 'chart-line',
    description: 'Trực quan hóa dữ liệu'
  },
  { 
    value: 'sensor', 
    label: 'Hiển thị cảm biến', 
    icon: 'thermometer',
    description: 'Dữ liệu cảm biến chỉ đọc'
  },
  { 
    value: 'gauge', 
    label: 'Đồng hồ đo', 
    icon: 'gauge',
    description: 'Chỉ báo tiến trình hình tròn'
  }
];

// Garden device icons with garden theme
const DEVICE_ICONS = [
  'leaf', 'flower', 'tree', 'sprout', 'seed', 'grass',
  'lightbulb', 'lightbulb-on', 'lightbulb-off', 'lamp', 'ceiling-light',
  'water', 'water-pump', 'valve', 'pipe', 'sprinkler',
  'thermometer', 'temperature-celsius', 'temperature-fahrenheit',
  'humidity', 'weather-sunny', 'weather-cloudy', 'weather-rainy',
  'fan', 'air-conditioner', 'radiator',
  'camera', 'camera-outline', 'webcam',
  'door', 'door-open', 'door-closed', 'garage',
  'speaker', 'volume-high', 'television',
  'security', 'shield', 'lock', 'key',
  'toggle-switch', 'power', 'power-on', 'power-off',
  'devices', 'router', 'server', 'chip', 'hardware-chip'
];

// Garden locations instead of rooms
const ROOMS = [
  'Nhà kính', 'Vườn ngoài trời', 'Ban công', 'Vườn trong nhà', 
  'Nhà kho vườn', 'Vườn trên sân thượng', 'Hệ thống thủy canh', 'Khu vực ươm cây', 'Khu ủ phân', 'Khác'
];

const AddDeviceScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const { configs: mqttConfigs, createDevice, updateDevice } = useMqtt();
  
  // Check if we're in edit mode
  const { device, isEditing } = route?.params || {};
  const isEditMode = isEditing && device;

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic info
    name: isEditMode ? device.name : '',
    description: isEditMode ? device.description : '',
    icon: isEditMode ? device.icon : 'devices',
    room: isEditMode ? device.room : 'Greenhouse',
    
    // Widget configuration
    widgetType: isEditMode ? device.widgetType : '',
    
    // MQTT configuration
    mqtt: {
      publishTopic: isEditMode ? device.mqtt?.publishTopic || '' : '',
      subscribeTopic: isEditMode ? device.mqtt?.subscribeTopic || '' : '',
      qos: isEditMode ? device.mqtt?.qos || 1 : 1,
      retain: isEditMode ? device.mqtt?.retain || false : false,
      payloadType: isEditMode ? device.mqtt?.payloadType || 'text' : 'text',
      jsonSchema: isEditMode ? device.mqtt?.jsonSchema || null : null
    },
    
    // UI Options (dynamic based on widget type)
    uiOptions: isEditMode ? device.uiOptions || {
      onLabel: 'BẬT',
      offLabel: 'TẮT',
      min: 0,
      max: 100,
      step: 1,
      colorFormat: 'hex',
      timeFormat: '24h',
      states: [],
      chartOptions: {
        type: 'line',
        historyLength: 100,
        updateInterval: 5000
      }
    } : {
      onLabel: 'BẬT',
      offLabel: 'TẮT',
      min: 0,
      max: 100,
      step: 1,
      colorFormat: 'hex',
      timeFormat: '24h',
      states: [],
      chartOptions: {
        type: 'line',
        historyLength: 100,
        updateInterval: 5000
      }
    },
    
    // Advanced options
    advancedOptions: isEditMode ? device.advancedOptions || {
      showTime: true,
      showSentLog: false,
      confirmOnPublish: false,
      autoReconnect: true,
      logHistory: true,
      maxLogEntries: 100
    } : {
      showTime: true,
      showSentLog: false,
      confirmOnPublish: false,
      autoReconnect: true,
      logHistory: true,
      maxLogEntries: 100
    },
    
    // MQTT Config ID
    mqttConfigId: isEditMode ? device.mqttConfigId || '' : ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Menu states
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [showIconMenu, setShowIconMenu] = useState(false);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [showMqttConfigMenu, setShowMqttConfigMenu] = useState(false);
  
  // Dialog states
  const [showStateDialog, setShowStateDialog] = useState(false);
  const [newState, setNewState] = useState({ label: '', value: '', color: '#2196F3' });

  // Auto-select first MQTT config if available
  useEffect(() => {
    if (mqttConfigs && mqttConfigs.length > 0 && !formData.mqttConfigId) {
      setFormData(prev => ({
        ...prev,
        mqttConfigId: mqttConfigs[0]._id
      }));
    }
  }, [mqttConfigs]);

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNestedFormData = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const validateCurrentStep = () => {
    const newErrors = {};
    
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Tên thiết bị là bắt buộc';
      }
      if (!formData.widgetType) {
        newErrors.widgetType = 'Vui lòng chọn loại widget';
      }
    }
    
    if (currentStep === 2) {
      if (!formData.mqtt.publishTopic.trim()) {
        newErrors.publishTopic = 'Topic xuất bản là bắt buộc';
      }
      if (!formData.mqttConfigId) {
        newErrors.mqttConfigId = 'Vui lòng chọn cấu hình MQTT';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSave = async () => {
    if (!validateCurrentStep()) return;
    
    setLoading(true);
    try {
      // Ensure all required fields are present with defaults
      const deviceData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        icon: formData.icon || 'devices',
        room: formData.room || 'Greenhouse',
        widgetType: formData.widgetType,
        mqtt: {
          publishTopic: formData.mqtt.publishTopic.trim(),
          subscribeTopic: formData.mqtt.subscribeTopic?.trim() || '',
          qos: formData.mqtt.qos || 1,
          retain: formData.mqtt.retain || false,
          payloadType: formData.mqtt.payloadType || 'text',
          jsonSchema: formData.mqtt.jsonSchema || null
        },
        uiOptions: formData.uiOptions || {
          onLabel: 'BẬT',
          offLabel: 'TẮT',
          min: 0,
          max: 100,
          step: 1,
          colorFormat: 'hex',
          timeFormat: '24h',
          states: [],
          chartOptions: {
            type: 'line',
            historyLength: 100,
            updateInterval: 5000
          }
        },
        advancedOptions: formData.advancedOptions || {
          showTime: true,
          showSentLog: false,
          confirmOnPublish: false,
          autoReconnect: true,
          logHistory: true,
          maxLogEntries: 100
        },
        mqttConfigId: formData.mqttConfigId,
        userId: user._id,
        isEnabled: true
      };
      
      console.log('📤 Sending device data:', JSON.stringify(deviceData, null, 2));
      
      if (isEditMode) {
        await updateDevice(device._id, deviceData);
        Alert.alert(
          'Thành công',
          'Thiết bị đã được cập nhật thành công!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        await createDevice(deviceData);
        Alert.alert(
          'Thành công',
          'Thiết bị đã được tạo thành công!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('❌ Device save error:', error);
      Alert.alert('Lỗi', error.message || `Không thể ${isEditMode ? 'cập nhật' : 'tạo'} thiết bị`);
    } finally {
      setLoading(false);
    }
  };

  const addMultiState = () => {
    if (newState.label && newState.value) {
      const updatedStates = [...formData.uiOptions.states, { ...newState }];
      updateNestedFormData('uiOptions', 'states', updatedStates);
      setNewState({ label: '', value: '', color: '#2196F3' });
      setShowStateDialog(false);
    }
  };

  const removeMultiState = (index) => {
    const updatedStates = formData.uiOptions.states.filter((_, i) => i !== index);
    updateNestedFormData('uiOptions', 'states', updatedStates);
  };

  const selectedWidget = WIDGET_TYPES.find(type => type.value === formData.widgetType);
  const selectedMqttConfig = mqttConfigs?.find(config => config._id === formData.mqttConfigId);

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map(step => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            { backgroundColor: currentStep >= step ? '#8BC34A' : 'rgba(255, 255, 255, 0.2)' }
          ]}>
            <Text style={[
              styles.stepText,
              { color: currentStep >= step ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)' }
            ]}>
              {step}
            </Text>
          </View>
          <Text style={styles.stepLabel}>
            {step === 1 && 'Thông tin cơ bản'}
            {step === 2 && 'Mạng vườn'}
            {step === 3 && 'Tùy chọn giao diện'}
            {step === 4 && 'Nâng cao'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderBasicInfoStep = () => (
    <View style={styles.stepCard}>
      <View style={{ padding: 20 }}>
        <Text style={styles.stepTitle}>🌱 Thông tin thiết bị</Text>
        <Text style={styles.stepSubtitle}>Thông tin cơ bản cho thiết bị vườn của bạn</Text>
        
        <TextInput
          label="Tên thiết bị *"
          value={formData.name}
          onChangeText={(text) => updateFormData('name', text)}
          style={styles.input}
          error={!!errors.name}
          placeholder="Thiết bị vườn của tôi"
          placeholderTextColor="rgba(255, 255, 255, 0.7)"
          left={<TextInput.Icon icon="leaf" color="#8BC34A" />}
          theme={INPUT_THEME}
          textColor="#FFFFFF"
        />
        <HelperText type="error" visible={!!errors.name} style={styles.errorText}>
          {errors.name}
        </HelperText>

        <TextInput
          label="Mô tả"
          value={formData.description}
          onChangeText={(text) => updateFormData('description', text)}
          style={styles.input}
          multiline
          numberOfLines={2}
          left={<TextInput.Icon icon="text" color="#8BC34A" />}
          placeholder="Mô tả mục đích của thiết bị trong vườn..."
          placeholderTextColor="rgba(255, 255, 255, 0.7)"
          theme={INPUT_THEME}
          textColor="#FFFFFF"
        />

        <Menu
          visible={showWidgetMenu}
          onDismiss={() => setShowWidgetMenu(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setShowWidgetMenu(true)}
              style={[styles.input, { justifyContent: 'flex-start' }]}
              contentStyle={{ justifyContent: 'flex-start' }}
              icon={selectedWidget?.icon || 'chevron-down'}
              error={!!errors.widgetType}
              labelStyle={{ color: '#FFFFFF' }}
              theme={{ colors: { outline: 'rgba(255, 255, 255, 0.3)' } }}
            >
              {selectedWidget?.label || 'Chọn loại điều khiển *'}
            </Button>
          }
        >
          {WIDGET_TYPES.map((type) => (
            <Menu.Item
              key={type.value}
              leadingIcon={type.icon}
              onPress={() => {
                updateFormData('widgetType', type.value);
                setShowWidgetMenu(false);
              }}
              title={type.label}
              titleStyle={{ fontSize: 14 }}
            />
          ))}
        </Menu>
        <HelperText type="error" visible={!!errors.widgetType} style={{ color: '#FFB3B3' }}>
          {errors.widgetType}
        </HelperText>

        {selectedWidget && (
          <View style={styles.infoCard}>
            <View style={{ padding: 16 }}>
              <Text style={styles.infoTitle}>{selectedWidget.label}</Text>
              <Text style={styles.infoDescription}>{selectedWidget.description}</Text>
            </View>
          </View>
        )}

        <Menu
          visible={showIconMenu}
          onDismiss={() => setShowIconMenu(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setShowIconMenu(true)}
              style={[styles.input, { justifyContent: 'flex-start' }]}
              contentStyle={{ justifyContent: 'flex-start' }}
              icon={formData.icon}
              labelStyle={{ color: '#FFFFFF' }}
              theme={{ colors: { outline: 'rgba(255, 255, 255, 0.3)' } }}
            >
              Select Device Icon
            </Button>
          }
        >
          <ScrollView style={{ maxHeight: 300 }}>
            {DEVICE_ICONS.map((icon) => (
              <Menu.Item
                key={icon}
                leadingIcon={icon}
                onPress={() => {
                  updateFormData('icon', icon);
                  setShowIconMenu(false);
                }}
                title={icon}
              />
            ))}
          </ScrollView>
        </Menu>

        <Menu
          visible={showRoomMenu}
          onDismiss={() => setShowRoomMenu(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setShowRoomMenu(true)}
              style={[styles.input, { justifyContent: 'flex-start' }]}
              contentStyle={{ justifyContent: 'flex-start' }}
              icon="map-marker-outline"
              labelStyle={{ color: '#FFFFFF' }}
              theme={{ colors: { outline: 'rgba(255, 255, 255, 0.3)' } }}
            >
              Location: {formData.room}
            </Button>
          }
        >
          {ROOMS.map((room) => (
            <Menu.Item
              key={room}
              onPress={() => {
                updateFormData('room', room);
                setShowRoomMenu(false);
              }}
              title={room}
            />
          ))}
        </Menu>
      </View>
    </View>
  );

  const renderMqttConfigStep = () => (
    <View style={styles.stepCard}>
      <View style={{ padding: 20 }}>
        <Text style={styles.stepTitle}>🌐 Garden Network Configuration</Text>
        <Text style={styles.stepSubtitle}>Kết nối thiết bị của bạn vào mạng vườn</Text>
        
        <Menu
          visible={showMqttConfigMenu}
          onDismiss={() => setShowMqttConfigMenu(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setShowMqttConfigMenu(true)}
              style={[styles.input, { justifyContent: 'flex-start' }]}
              contentStyle={{ justifyContent: 'flex-start' }}
              icon="server"
              error={!!errors.mqttConfigId}
              labelStyle={{ color: '#FFFFFF' }}
              theme={{ colors: { outline: 'rgba(255, 255, 255, 0.3)' } }}
            >
              {selectedMqttConfig?.name || 'Chọn mạng vườn *'}
            </Button>
          }
        >
          {mqttConfigs?.map((config) => (
            <Menu.Item
              key={config._id}
              onPress={() => {
                updateFormData('mqttConfigId', config._id);
                setShowMqttConfigMenu(false);
              }}
              title={config.name}
              titleStyle={{ fontSize: 14 }}
            />
          ))}
        </Menu>
        <HelperText type="error" visible={!!errors.mqttConfigId} style={{ color: '#FFB3B3' }}>
          {errors.mqttConfigId}
        </HelperText>

        <TextInput
          label="Chủ đề thiết bị *"
          value={formData.mqtt.publishTopic}
          onChangeText={(text) => updateNestedFormData('mqtt', 'publishTopic', text)}
          style={styles.input}
          error={!!errors.publishTopic}
          placeholder="vuon/nha-kinh/cam-bien/dat"
          left={<TextInput.Icon icon="message-outline" color="#8BC34A" />}
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
        <HelperText type="error" visible={!!errors.publishTopic} style={{ color: '#FFB3B3' }}>
          {errors.publishTopic}
        </HelperText>

        <TextInput
          label="Chủ đề trạng thái (tùy chọn)"
          value={formData.mqtt.subscribeTopic}
          onChangeText={(text) => updateNestedFormData('mqtt', 'subscribeTopic', text)}
          style={styles.input}
          placeholder="vuon/nha-kinh/cam-bien/dat/trang-thai"
          left={<TextInput.Icon icon="download" color="#8BC34A" />}
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

        <Text style={styles.sectionTitle}>Mức QoS</Text>
        <SegmentedButtons
          value={formData.mqtt.qos.toString()}
          onValueChange={(value) => updateNestedFormData('mqtt', 'qos', parseInt(value))}
          buttons={[
            { value: '0', label: 'QoS 0' },
            { value: '1', label: 'QoS 1' },
            { value: '2', label: 'QoS 2' }
          ]}
          style={styles.segmentedButtons}
        />

        <Text style={styles.sectionTitle}>Loại dữ liệu</Text>
        <SegmentedButtons
          value={formData.mqtt.payloadType}
          onValueChange={(value) => updateNestedFormData('mqtt', 'payloadType', value)}
          buttons={[
            { value: 'text', label: 'Văn bản thuần', icon: 'format-text' },
            { value: 'json', label: 'JSON', icon: 'code-json' }
          ]}
          style={styles.segmentedButtons}
        />

        <View style={styles.switchRow}>
          <Text style={{ color: '#FFFFFF' }}>Giữ lại tin nhắn</Text>
          <Switch
            value={formData.mqtt.retain}
            onValueChange={(value) => updateNestedFormData('mqtt', 'retain', value)}
            trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#8BC34A' }}
            thumbColor={formData.mqtt.retain ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)'}
          />
        </View>
      </View>
    </View>
  );

  const renderUIOptionsStep = () => {
    if (!formData.widgetType) return null;

    return (
      <View style={styles.stepCard}>
        <View style={{ padding: 20 }}>
          <Text style={styles.stepTitle}>🎛️ Giao diện điều khiển</Text>
          <Text style={styles.stepSubtitle}>Cấu hình cách bạn tương tác với thiết bị này</Text>

          {/* Button/Switch options */}
          {(formData.widgetType === 'button' || formData.widgetType === 'switch') && (
            <>
              <TextInput
                label="Nhãn BẬT"
                value={formData.uiOptions.onLabel}
                onChangeText={(text) => updateNestedFormData('uiOptions', 'onLabel', text)}
                style={styles.input}
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
                label="Nhãn TẮT"
                value={formData.uiOptions.offLabel}
                onChangeText={(text) => updateNestedFormData('uiOptions', 'offLabel', text)}
                style={styles.input}
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
            </>
          )}

          {/* Slider options */}
          {(formData.widgetType === 'slider' || formData.widgetType === 'gauge') && (
            <>
              <Text style={styles.sectionTitle}>Cài đặt phạm vi</Text>
              <View style={styles.row}>
                <TextInput
                  label="Tối thiểu"
                  value={formData.uiOptions.min.toString()}
                  onChangeText={(text) => updateNestedFormData('uiOptions', 'min', parseFloat(text) || 0)}
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
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
                  label="Tối đa"
                  value={formData.uiOptions.max.toString()}
                  onChangeText={(text) => updateNestedFormData('uiOptions', 'max', parseFloat(text) || 100)}
                  style={[styles.input, { flex: 1, marginLeft: 8 }]}
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
                label="Bước nhảy"
                value={formData.uiOptions.step.toString()}
                onChangeText={(text) => updateNestedFormData('uiOptions', 'step', parseFloat(text) || 1)}
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
            </>
          )}

          {/* Color picker options */}
          {formData.widgetType === 'colorPicker' && (
            <>
              <Text style={styles.sectionTitle}>Định dạng màu</Text>
              <SegmentedButtons
                value={formData.uiOptions.colorFormat}
                onValueChange={(value) => updateNestedFormData('uiOptions', 'colorFormat', value)}
                buttons={[
                  { value: 'hex', label: 'HEX' },
                  { value: 'rgb', label: 'RGB' },
                  { value: 'hsl', label: 'HSL' }
                ]}
                style={styles.segmentedButtons}
              />
            </>
          )}

          {/* Time picker options */}
          {formData.widgetType === 'timePicker' && (
            <>
              <Text style={styles.sectionTitle}>Định dạng thời gian</Text>
              <SegmentedButtons
                value={formData.uiOptions.timeFormat}
                onValueChange={(value) => updateNestedFormData('uiOptions', 'timeFormat', value)}
                buttons={[
                  { value: '24h', label: '24 giờ' },
                  { value: '12h', label: '12 giờ' }
                ]}
                style={styles.segmentedButtons}
              />
            </>
          )}

          {/* Multi-state options */}
          {formData.widgetType === 'multiState' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Trạng thái</Text>
                <IconButton
                  icon="plus"
                  mode="contained"
                  size={20}
                  onPress={() => setShowStateDialog(true)}
                  iconColor="#FFFFFF"
                  containerColor="#8BC34A"
                />
              </View>
              
              {formData.uiOptions.states.map((state, index) => (
                <View key={index} style={styles.stateCard}>
                  <View style={{ padding: 16 }}>
                    <View style={styles.stateRow}>
                      <View style={[styles.stateColor, { backgroundColor: state.color }]} />
                      <View style={styles.stateInfo}>
                        <Text style={styles.stateLabel}>{state.label}</Text>
                        <Text style={styles.stateValue}>Giá trị: {state.value}</Text>
                      </View>
                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => removeMultiState(index)}
                        iconColor="#FF6B6B"
                      />
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Chart options */}
          {formData.widgetType === 'chart' && (
            <>
              <Text style={styles.sectionTitle}>Loại biểu đồ</Text>
              <SegmentedButtons
                value={formData.uiOptions.chartOptions.type}
                onValueChange={(value) => updateNestedFormData('uiOptions', 'chartOptions', {
                  ...formData.uiOptions.chartOptions,
                  type: value
                })}
                buttons={[
                  { value: 'line', label: 'Đường', icon: 'chart-line' },
                  { value: 'bar', label: 'Cột', icon: 'chart-bar' },
                  { value: 'pie', label: 'Tròn', icon: 'chart-pie' }
                ]}
                style={styles.segmentedButtons}
              />
              
              <TextInput
                label="Độ dài lịch sử"
                value={formData.uiOptions.chartOptions.historyLength.toString()}
                onChangeText={(text) => updateNestedFormData('uiOptions', 'chartOptions', {
                  ...formData.uiOptions.chartOptions,
                  historyLength: parseInt(text) || 100
                })}
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
            </>
          )}
        </View>
      </View>
    );
  };

  const renderAdvancedOptionsStep = () => (
    <View style={styles.stepCard}>
      <View style={{ padding: 20 }}>
        <Text style={styles.stepTitle}>⚙️ Advanced Settings</Text>
        <Text style={styles.stepSubtitle}>Fine-tune your device behavior</Text>
        
        <View style={styles.switchRow}>
          <Text style={{ color: '#FFFFFF', flex: 1 }}>Hiển thị thời gian</Text>
          <Switch
            value={formData.advancedOptions.showTime}
            onValueChange={(value) => updateNestedFormData('advancedOptions', 'showTime', value)}
            trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#8BC34A' }}
            thumbColor={formData.advancedOptions.showTime ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)'}
          />
        </View>
        
        <View style={styles.switchRow}>
          <Text style={{ color: '#FFFFFF', flex: 1 }}>Hiển thị nhật ký gửi</Text>
          <Switch
            value={formData.advancedOptions.showSentLog}
            onValueChange={(value) => updateNestedFormData('advancedOptions', 'showSentLog', value)}
            trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#8BC34A' }}
            thumbColor={formData.advancedOptions.showSentLog ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)'}
          />
        </View>
        
        <View style={styles.switchRow}>
          <Text style={{ color: '#FFFFFF', flex: 1 }}>Xác nhận khi gửi</Text>
          <Switch
            value={formData.advancedOptions.confirmOnPublish}
            onValueChange={(value) => updateNestedFormData('advancedOptions', 'confirmOnPublish', value)}
            trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#8BC34A' }}
            thumbColor={formData.advancedOptions.confirmOnPublish ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)'}
          />
        </View>
        
        <View style={styles.switchRow}>
          <Text style={{ color: '#FFFFFF', flex: 1 }}>Tự động kết nối lại</Text>
          <Switch
            value={formData.advancedOptions.autoReconnect}
            onValueChange={(value) => updateNestedFormData('advancedOptions', 'autoReconnect', value)}
            trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#8BC34A' }}
            thumbColor={formData.advancedOptions.autoReconnect ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)'}
          />
        </View>
        
        <View style={styles.switchRow}>
          <Text style={{ color: '#FFFFFF', flex: 1 }}>Lưu nhật ký</Text>
          <Switch
            value={formData.advancedOptions.logHistory}
            onValueChange={(value) => updateNestedFormData('advancedOptions', 'logHistory', value)}
            trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#8BC34A' }}
            thumbColor={formData.advancedOptions.logHistory ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)'}
          />
        </View>

        {formData.advancedOptions.logHistory && (
          <TextInput
            label="Số lượng nhật ký tối đa"
            value={formData.advancedOptions.maxLogEntries.toString()}
            onChangeText={(text) => updateNestedFormData('advancedOptions', 'maxLogEntries', parseInt(text) || 100)}
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
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Modern Gradient Background */}
      <LinearGradient
        colors={[
          '#767E67', // Light gray-green
          '#4C533E', // Medium light gray
          '#3C3C40', // Medium gray
          '#3C3C40'  // Darker gray
        ]}
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
              <Text style={styles.headerTitle}>
                {isEditMode ? "Chỉnh sửa thiết bị vườn" : "Thêm thiết bị vườn"}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isEditMode ? "Cập nhật cấu hình thiết bị" : `Bước ${currentStep} / 4`}
              </Text>
            </View>

            <View style={styles.headerRight}>
              {/* Placeholder for balance */}
            </View>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {renderStepIndicator()}
            
            {currentStep === 1 && renderBasicInfoStep()}
            {currentStep === 2 && renderMqttConfigStep()}
            {currentStep === 3 && renderUIOptionsStep()}
            {currentStep === 4 && renderAdvancedOptionsStep()}

            <View style={styles.buttonContainer}>
              {currentStep > 1 && (
                <Button
                  mode="outlined"
                  onPress={prevStep}
                  style={[styles.button, styles.secondaryButton]}
                  labelStyle={styles.secondaryButtonText}
                  icon="chevron-left"
                >
                  Previous
                </Button>
              )}
              
              {currentStep < 4 ? (
                <Button
                  mode="contained"
                  onPress={nextStep}
                  style={[styles.button, styles.primaryButton]}
                  labelStyle={styles.primaryButtonText}
                  icon="chevron-right"
                  buttonColor="#8BC34A"
                >
                  Next
                </Button>
              ) : (
                <Button
                  mode="contained"
                  onPress={handleSave}
                  style={[styles.button, styles.primaryButton]}
                  labelStyle={styles.primaryButtonText}
                  loading={loading}
                  icon="check"
                  buttonColor="#8BC34A"
                >
                  {isEditMode ? "Cập nhật thiết bị" : "Thêm vào vườn"}
                </Button>
              )}
            </View>

            {/* Bottom spacing to avoid TabBar overlap */}
            <View style={styles.bottomSpacing} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Multi-state dialog */}
      <Portal>
        <Dialog visible={showStateDialog} onDismiss={() => setShowStateDialog(false)}>
          <Dialog.Title>Thêm trạng thái</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nhãn"
              value={newState.label}
              onChangeText={(text) => setNewState({ ...newState, label: text })}
              style={styles.dialogInput}
            />
            <TextInput
              label="Giá trị"
              value={newState.value}
              onChangeText={(text) => setNewState({ ...newState, value: text })}
              style={styles.dialogInput}
            />
            <TextInput
              label="Màu sắc (hex)"
              value={newState.color}
              onChangeText={(text) => setNewState({ ...newState, color: text })}
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowStateDialog(false)}>Hủy</Button>
            <Button onPress={addMultiState}>Thêm</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  
  // Modern Header Styles
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 12,
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
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 2,
  },
  headerRight: {
    width: 40, // Balance layout
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Extra spacing to avoid TabBar
  },

  // Step Indicator with Glass Effect
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },

  // Step Cards with Glass Effect
  stepCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  stepSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
    lineHeight: 20,
  },

  // Input Styles
  input: {
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },

  // Info Cards
  infoCard: {
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.3)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8BC34A',
  },
  infoDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },

  // Section Styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },

  // Form Controls
  segmentedButtons: {
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // State Cards
  stateCard: {
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stateColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  stateInfo: {
    flex: 1,
  },
  stateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stateValue: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Button Styles
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 16,
  },
  primaryButton: {
    backgroundColor: '#8BC34A',
    borderRadius: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },

  // Dialog
  dialogInput: {
    marginBottom: 8,
  },
  
  // Error Text
  errorText: {
    color: '#FFB3B3',
    fontSize: 12,
  },
  
  // Bottom Spacing
  bottomSpacing: {
    height: 40,
  },
});

export default AddDeviceScreen;
