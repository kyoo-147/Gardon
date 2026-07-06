import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { secureStorage } from '../utils';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000, // Increased timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('🌐 API Service initialized with base URL:', API_BASE_URL);

    // Request interceptor to add auth token and logging
    this.api.interceptors.request.use(
      async (config) => {
        console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        
        const token = await secureStorage.getItem('user_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        console.error('📤 Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors and logging
    this.api.interceptors.response.use(
      (response) => {
        console.log(`📥 API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      async (error) => {
        console.error('📥 Response Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
          baseURL: error.config?.baseURL
        });

        // Handle different types of errors
        if (!error.response) {
          // Network error
          throw new Error('Kết nối mạng thất bại. Vui lòng kiểm tra kết nối internet và trạng thái máy chủ.');
        }

        if (error.response?.status === 401) {
          // Token expired or invalid
          await secureStorage.removeItem('user_token');
          await secureStorage.removeItem('user_data');
          throw new Error('Xác thực thất bại. Vui lòng đăng nhập lại.');
        }

        if (error.response?.status >= 500) {
          throw new Error('Lỗi máy chủ. Vui lòng thử lại sau.');
        }

        return Promise.reject(error);
      }
    );
  }

  // Test connection endpoint
  async testConnection() {
    try {
      console.log('🔍 Testing API connection...');
      const response = await this.api.get('/health');
      console.log('✅ API connection successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API connection failed:', error.message);
      throw error;
    }
  }

  // Auth endpoints
  async login(credentials) {
    const response = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData) {
    const response = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  async updateProfile(profileData) {
    const response = await this.api.put('/auth/profile', profileData);
    return response.data;
  }

  async changePassword(passwordData) {
    const response = await this.api.post('/auth/change-password', passwordData);
    return response.data;
  }

  // MQTT Configuration endpoints
  async getMqttConfigs(userId) {
    const response = await this.api.get(`/mqtt-config?userId=${userId}`);
    return response.data;
  }

  async getAllMqttConfigs(userId) {
    const response = await this.api.get(`/mqtt-config/all?userId=${userId}`);
    return response.data;
  }

  async getMqttConfig(id) {
    const response = await this.api.get(`/mqtt-config/${id}`);
    return response.data;
  }

  async createMqttConfig(configData) {
    const response = await this.api.post('/mqtt-config', configData);
    return response.data;
  }

  async updateMqttConfig(id, configData) {
    const response = await this.api.put(`/mqtt-config/${id}`, configData);
    return response.data;
  }

  async deleteMqttConfig(id) {
    const response = await this.api.delete(`/mqtt-config/${id}`);
    return response.data;
  }

  async setDefaultMqttConfig(id) {
    const response = await this.api.post(`/mqtt-config/${id}/set-default`);
    return response.data;
  }

  async testMqttConnection(configData) {
    const response = await this.api.post('/mqtt-config/test', configData);
    return response.data;
  }

  async testMqttSubscribe(configData) {
    const response = await this.api.post('/mqtt-config/test-subscribe', configData);
    return response.data;
  }

  async testMqttPublish(configData) {
    const response = await this.api.post('/mqtt-config/test-publish', configData);
    return response.data;
  }

  async checkMqttMessages(configData) {
    const response = await this.api.post('/mqtt-config/check-messages', configData);
    return response.data;
  }

  async cleanupMqttTest(configData) {
    const response = await this.api.post('/mqtt-config/cleanup-test', configData);
    return response.data;
  }

  // Device endpoints
  async getDevices(userId, room = null) {
    let url = `/devices?userId=${userId}`;
    if (room) {
      url += `&room=${encodeURIComponent(room)}`;
    }
    const response = await this.api.get(url);
    return response.data;
  }

  async getDevicesByConfig(mqttConfigId, userId, room = null) {
    let url = `/devices?mqttConfigId=${mqttConfigId}&userId=${userId}`;
    if (room) {
      url += `&room=${encodeURIComponent(room)}`;
    }
    const response = await this.api.get(url);
    return response.data;
  }

  async getDevice(id) {
    const response = await this.api.get(`/devices/${id}`);
    return response.data;
  }

  async createDevice(deviceData) {
    const response = await this.api.post('/devices', deviceData);
    return response.data;
  }

  async updateDevice(id, deviceData) {
    const response = await this.api.put(`/devices/${id}`, deviceData);
    return response.data;
  }

  async deleteDevice(id) {
    const response = await this.api.delete(`/devices/${id}`);
    return response.data;
  }

  async controlDevice(id, command, value = null) {
    const response = await this.api.post(`/devices/${id}/control`, {
      command,
      value
    });
    return response.data;
  }

  async getDeviceStatus(id) {
    const response = await this.api.get(`/devices/${id}/status`);
    return response.data;
  }

  async bulkControlDevices(deviceIds, command, value = null) {
    const response = await this.api.post('/devices/bulk-control', {
      deviceIds,
      command,
      value
    });
    return response.data;
  }

  async getRooms(userId) {
    const response = await this.api.get(`/devices/rooms?userId=${userId}`);
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.api.get('/health');
    return response.data;
  }
}

export default new ApiService();
