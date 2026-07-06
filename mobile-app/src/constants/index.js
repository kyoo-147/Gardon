import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get environment variables from app config
const getApiUrl = () => {
  // Check if running on Expo Go or standalone app
  const { manifest } = Constants;
  
  // Priority order: 
  // 1. Environment variable from .env
  // 2. Expo config
  // 3. Platform-specific defaults
  
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    console.log('🔗 Using API URL from env:', process.env.EXPO_PUBLIC_API_BASE_URL);
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  
  if (manifest?.extra?.apiBaseUrl) {
    console.log('🔗 Using API URL from manifest:', manifest.extra.apiBaseUrl);
    return manifest.extra.apiBaseUrl;
  }
  
  // Force use current backend IP for development
  const developmentUrl = 'http://192.168.100.62:3000/api';
  console.log('🔗 Using development API URL:', developmentUrl);
  return developmentUrl;
};

const getSocketUrl = () => {
  if (process.env.EXPO_PUBLIC_SOCKET_URL) {
    console.log('🔌 Using Socket URL from env:', process.env.EXPO_PUBLIC_SOCKET_URL);
    return process.env.EXPO_PUBLIC_SOCKET_URL;
  }
  
  const { manifest } = Constants;
  if (manifest?.extra?.socketUrl) {
    console.log('🔌 Using Socket URL from manifest:', manifest.extra.socketUrl);
    return manifest.extra.socketUrl;
  }
  
  // Force use current backend IP for development
  const developmentUrl = 'http://192.168.100.62:3000';
  console.log('🔌 Using development Socket URL:', developmentUrl);
  return developmentUrl;
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${getApiUrl()}/auth/login`,
  REGISTER: `${getApiUrl()}/auth/register`,
  REFRESH_TOKEN: `${getApiUrl()}/auth/refresh`,
  
  // Device endpoints
  DEVICES: `${getApiUrl()}/devices`,
  
  // MQTT Config endpoints
  MQTT_CONFIG: `${getApiUrl()}/mqtt-config`,
  
  // Social endpoints
  MQTT_USERS: `${getApiUrl()}/social/mqtt-users`,
  FRIEND_REQUEST: `${getApiUrl()}/social/friend-request`,
  FRIEND_REQUESTS: `${getApiUrl()}/social/friend-requests`,
  FRIEND_RESPONSE: `${getApiUrl()}/social/friend-response`,
  FRIENDS: `${getApiUrl()}/social/friends`,
  
  // Messages endpoints
  CONVERSATIONS: `${getApiUrl()}/messages/conversations`,
  SEND_MESSAGE: `${getApiUrl()}/messages/send`,
  
  // Test endpoints
  TEST_CONNECTION: `${getApiUrl()}/test-connection`,
};

export const DEVICE_TYPES = {
  SWITCH: 'switch',
  SENSOR: 'sensor',
  DIMMER: 'dimmer',
  RGB_LIGHT: 'rgb_light',
  THERMOSTAT: 'thermostat',
  CUSTOM: 'custom'
};

export const MQTT_DEFAULT_CONFIG = {
  host: 'broker.hivemq.com',
  port: 1883,
  keepAlive: 60,
  cleanSession: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
  protocolId: 'MQTT',
  protocolVersion: 4
};

export const COLORS = {
  primary: '#2E7D32',      // Modern green - more suitable for smart home/garden
  primaryDark: '#1B5E20',
  secondary: '#4CAF50',    // Complementary green
  background: '#F8FAF9',   // Soft off-white background
  surface: '#FFFFFF',
  error: '#D32F2F',
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',
  
  // Text colors
  text: '#1C1B1F',
  textSecondary: '#666666',
  textLight: '#999999',
  white: '#FFFFFF',
  black: '#000000',
  
  // UI elements
  border: '#E0E0E0',
  divider: '#F0F0F0',
  disabled: '#BDBDBD',
  
  // Legacy support
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onBackground: '#1C1B1F',
  onSurface: '#1C1B1F',
  onError: '#FFFFFF',
  
  // Smart home/garden specific colors
  online: '#4CAF50',
  offline: '#F44336',
  connecting: '#FF9800',
  
  // Modern gradient colors
  gradientStart: '#2E7D32',
  gradientEnd: '#4CAF50',
  
  // Dark theme
  dark: {
    primary: '#BB86FC',
    primaryDark: '#3700B3',
    secondary: '#03DAC6',
    background: '#121212',
    surface: '#1E1E1E',
    error: '#CF6679',
    onPrimary: '#000000',
    onSecondary: '#000000',
    onBackground: '#FFFFFF',
    onSurface: '#FFFFFF',
    onError: '#000000'
  }
};

export const STORAGE_KEYS = {
  USER_TOKEN: 'user_token',
  USER_DATA: 'user_data',
  MQTT_CONFIG: 'mqtt_config',
  MQTT_CONNECTION_STATE: 'mqtt_connection_state',
  MQTT_AUTO_RECONNECT: 'mqtt_auto_reconnect',
  APP_SETTINGS: 'app_settings'
};
