import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  async setItem(key, value) {
    try {
      await SecureStore.setItemAsync(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error storing item:', error);
      throw error;
    }
  },

  async getItem(key) {
    try {
      const value = await SecureStore.getItemAsync(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error retrieving item:', error);
      return null;
    }
  },

  async removeItem(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    }
  },

  async clear() {
    try {
      // Get all keys and remove them
      const keys = ['user_token', 'user_data', 'mqtt_config', 'app_settings'];
      await Promise.all(keys.map(key => this.removeItem(key)));
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }
};

export const formatDeviceValue = (value, type, unit) => {
  if (value === null || value === undefined) return 'N/A';
  
  switch (type) {
    case 'switch':
      return value === 'ON' || value === '1' || value === 1 || value === true ? 'ON' : 'OFF';
    case 'sensor':
      return `${value}${unit ? ` ${unit}` : ''}`;
    case 'dimmer':
      return `${value}%`;
    case 'thermostat':
      return `${value}°C`;
    default:
      return value.toString();
  }
};

export const generateClientId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `mqtt_mobile_${timestamp}_${random}`;
};

export const validateMqttConfig = (config) => {
  const errors = [];
  
  if (!config.name || config.name.trim().length === 0) {
    errors.push('Tên cấu hình là bắt buộc');
  }
  
  if (!config.host || config.host.trim().length === 0) {
    errors.push('Máy chủ MQTT là bắt buộc');
  }
  
  if (!config.port || config.port < 1 || config.port > 65535) {
    errors.push('Cổng MQTT phải từ 1 đến 65535');
  }
  
  if (!config.clientId || config.clientId.trim().length === 0) {
    errors.push('ID máy khách là bắt buộc');
  }
  
  return errors;
};

export const validateDeviceConfig = (device) => {
  const errors = [];
  
  if (!device.name || device.name.trim().length === 0) {
    errors.push('Tên thiết bị là bắt buộc');
  }
  
  if (!device.type) {
    errors.push('Loại thiết bị là bắt buộc');
  }
  
  if (!device.topic || !device.topic.command || device.topic.command.trim().length === 0) {
    errors.push('Chủ đề lệnh là bắt buộc');
  }
  
  if (!device.topic || !device.topic.state || device.topic.state.trim().length === 0) {
    errors.push('Chủ đề trạng thái là bắt buộc');
  }
  
  return errors;
};

export const parseJsonSafely = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return jsonString;
  }
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Vừa xong';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} phút trước`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} giờ trước`;
  } else {
    return date.toLocaleDateString('vi-VN');
  }
};
