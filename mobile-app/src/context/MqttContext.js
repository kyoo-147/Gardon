import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import socketService from '../services/socket';
import apiService from '../services/api';
import { secureStorage } from '../utils';

// Initial state
const initialState = {
  configs: [],
  currentConfig: null,
  devices: [],
  rooms: [],
  mqttStatus: 'disconnected', // disconnected, connecting, connected, error, reconnecting
  isLoading: false,
  error: null,
  lastMessage: null,
  connectionAttempts: 0,
  maxRetries: 3,
  autoReconnect: true,
  isBackgroundMode: false,
};

// Action types
const MQTT_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_CONFIGS: 'SET_CONFIGS',
  ADD_CONFIG: 'ADD_CONFIG',
  UPDATE_CONFIG: 'UPDATE_CONFIG',
  DELETE_CONFIG: 'DELETE_CONFIG',
  SET_CURRENT_CONFIG: 'SET_CURRENT_CONFIG',
  SET_DEVICES: 'SET_DEVICES',
  ADD_DEVICE: 'ADD_DEVICE',
  UPDATE_DEVICE: 'UPDATE_DEVICE',
  DELETE_DEVICE: 'DELETE_DEVICE',
  SET_ROOMS: 'SET_ROOMS',
  SET_MQTT_STATUS: 'SET_MQTT_STATUS',
  SET_LAST_MESSAGE: 'SET_LAST_MESSAGE',
  UPDATE_DEVICE_STATE: 'UPDATE_DEVICE_STATE',
  SET_CONNECTION_ATTEMPTS: 'SET_CONNECTION_ATTEMPTS',
  SET_AUTO_RECONNECT: 'SET_AUTO_RECONNECT',
  SET_BACKGROUND_MODE: 'SET_BACKGROUND_MODE',
  RESET_CONNECTION_ATTEMPTS: 'RESET_CONNECTION_ATTEMPTS',
};

// Reducer
const mqttReducer = (state, action) => {
  switch (action.type) {
    case MQTT_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case MQTT_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };

    case MQTT_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    case MQTT_ACTIONS.SET_CONFIGS:
      return { ...state, configs: action.payload };

    case MQTT_ACTIONS.ADD_CONFIG:
      return { ...state, configs: [...state.configs, action.payload] };

    case MQTT_ACTIONS.UPDATE_CONFIG:
      return {
        ...state,
        configs: state.configs.map(config =>
          config._id === action.payload._id ? action.payload : config
        ),
      };

    case MQTT_ACTIONS.DELETE_CONFIG:
      return {
        ...state,
        configs: state.configs.filter(config => config._id !== action.payload),
        currentConfig: state.currentConfig?._id === action.payload ? null : state.currentConfig,
      };

    case MQTT_ACTIONS.SET_CURRENT_CONFIG:
      return { ...state, currentConfig: action.payload };

    case MQTT_ACTIONS.SET_DEVICES:
      return { ...state, devices: action.payload };

    case MQTT_ACTIONS.ADD_DEVICE:
      return { ...state, devices: [...state.devices, action.payload] };

    case MQTT_ACTIONS.UPDATE_DEVICE:
      return {
        ...state,
        devices: state.devices.map(device =>
          device._id === action.payload._id ? action.payload : device
        ),
      };

    case MQTT_ACTIONS.DELETE_DEVICE:
      return {
        ...state,
        devices: state.devices.filter(device => device._id !== action.payload),
      };

    case MQTT_ACTIONS.SET_ROOMS:
      return { ...state, rooms: action.payload };

    case MQTT_ACTIONS.SET_MQTT_STATUS:
      return { ...state, mqttStatus: action.payload };

    case MQTT_ACTIONS.SET_LAST_MESSAGE:
      return { ...state, lastMessage: action.payload };

    case MQTT_ACTIONS.UPDATE_DEVICE_STATE:
      return {
        ...state,
        devices: state.devices.map(device => 
          device._id === action.payload.deviceId 
            ? {
                ...device,
                currentState: {
                  ...device.currentState,
                  ...action.payload.newState
                }
              }
            : device
        ),
      };

    case MQTT_ACTIONS.SET_CONNECTION_ATTEMPTS:
      return { ...state, connectionAttempts: action.payload };

    case MQTT_ACTIONS.RESET_CONNECTION_ATTEMPTS:
      return { ...state, connectionAttempts: 0 };

    case MQTT_ACTIONS.SET_AUTO_RECONNECT:
      return { ...state, autoReconnect: action.payload };

    case MQTT_ACTIONS.SET_BACKGROUND_MODE:
      return { ...state, isBackgroundMode: action.payload };

    default:
      return state;
  }
};

// Create context
const MqttContext = createContext({
  configs: [],
  devices: [],
  selectedConfig: null,
  isLoading: false,
  error: null,
  connectionStatus: 'disconnected',
  addConfig: () => {},
  updateConfig: () => {},
  deleteConfig: () => {},
  selectConfig: () => {},
  addDevice: () => {},
  updateDevice: () => {},
  deleteDevice: () => {},
  controlDevice: () => {},
  testConnection: () => {},
  clearError: () => {},
});

// Provider component
export const MqttProvider = ({ children }) => {
  const [state, dispatch] = useReducer(mqttReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  
  // Connection retry logic
  const connectionTimeoutRef = React.useRef(null);
  const reconnectTimeoutRef = React.useRef(null);
  const stateRef = React.useRef(state);
  const isConnectingRef = React.useRef(false);

  // Keep state ref updated
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // App state monitoring for background mode
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      const currentState = stateRef.current;
      
      dispatch({ 
        type: MQTT_ACTIONS.SET_BACKGROUND_MODE, 
        payload: nextAppState === 'background' || nextAppState === 'inactive' 
      });
      
      // Only log app state changes, don't auto-reconnect to avoid loops
      if (nextAppState === 'active') {
        console.log('📱 App became active');
      } else {
        console.log('📱 App went to background/inactive');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Initialize socket listeners and load data
  useEffect(() => {
    if (isAuthenticated) {
      setupSocketListeners();
      loadInitialData();
      
      // Only restore connection state (don't auto-connect)
      setTimeout(() => {
        restoreConnectionState();
      }, 2000); // Increased delay to ensure UI is ready
    }

    return () => {
      socketService.removeAllListeners();
      clearTimeouts();
    };
  }, [isAuthenticated]);

  // Reload devices when current config changes
  useEffect(() => {
    if (state.currentConfig && user) {
      console.log('🔄 Current config changed, reloading devices for:', state.currentConfig.name);
      loadDevices();
    }
  }, [state.currentConfig, user]);

  // Clear timeouts on unmount
  const clearTimeouts = () => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  };

  // Restore connection state from storage
  const restoreConnectionState = async () => {
    try {
      const savedConnectionState = await secureStorage.getItem('mqtt_connection_state');
      const autoReconnectSetting = await secureStorage.getItem('mqtt_auto_reconnect');
      
      console.log('🔍 Checking saved connection state:', { savedConnectionState, autoReconnectSetting });
      
      if (autoReconnectSetting !== null) {
        dispatch({ type: MQTT_ACTIONS.SET_AUTO_RECONNECT, payload: autoReconnectSetting });
      }
      
      // Only restore config, don't auto-connect to avoid loops
      if (savedConnectionState && savedConnectionState.configId) {
        console.log('🔄 Found saved config, setting as current but not auto-connecting');
        
        // Load configs first to find the saved config
        const configs = await apiService.getMqttConfigs(user._id);
        const savedConfig = configs.find(config => config._id === savedConnectionState.configId);
        
        if (savedConfig) {
          console.log('📡 Setting saved config as current:', savedConfig.name);
          dispatch({ type: MQTT_ACTIONS.SET_CURRENT_CONFIG, payload: savedConfig });
        }
      }
    } catch (error) {
      console.error('Error restoring connection state:', error);
    }
  };

  // Save connection state to storage
  const saveConnectionState = async (config, isConnected) => {
    try {
      const connectionState = {
        configId: config?._id,
        wasConnected: isConnected,
        timestamp: new Date().toISOString(),
      };
      await secureStorage.setItem('mqtt_connection_state', connectionState);
      console.log('💾 Saved MQTT connection state:', connectionState);
    } catch (error) {
      console.error('Error saving connection state:', error);
    }
  };

  const setupSocketListeners = () => {
    // Remove any existing listeners to prevent duplicates
    socketService.removeAllListeners();
    
    socketService.on('mqtt_connected', (data) => {
      console.log('✅ MQTT Connected successfully');
      isConnectingRef.current = false;
      
      dispatch({ type: MQTT_ACTIONS.SET_MQTT_STATUS, payload: 'connected' });
      dispatch({ type: MQTT_ACTIONS.RESET_CONNECTION_ATTEMPTS });
      dispatch({ type: MQTT_ACTIONS.CLEAR_ERROR });
      
      // Save successful connection state
      const currentState = stateRef.current;
      if (currentState.currentConfig) {
        saveConnectionState(currentState.currentConfig, true);
      }
    });

    socketService.on('mqtt_disconnected', (data) => {
      console.log('❌ MQTT Disconnected:', data);
      isConnectingRef.current = false;
      
      dispatch({ type: MQTT_ACTIONS.SET_MQTT_STATUS, payload: 'disconnected' });
      
      // Save disconnected state
      const currentState = stateRef.current;
      if (currentState.currentConfig) {
        saveConnectionState(currentState.currentConfig, false);
      }
      
      // Only auto-reconnect if:
      // 1. Auto-reconnect is enabled
      // 2. Not in background mode
      // 3. Have a current config
      // 4. Haven't exceeded max retries
      // 5. Not already connecting
      // 6. Disconnection was unexpected (not manual)
      const wasManualDisconnect = data?.manual || false;
      
      if (!wasManualDisconnect) {
        // Add longer delay for unexpected disconnects to prevent rapid reconnection
        setTimeout(() => {
          const latestState = stateRef.current;
          if (latestState.autoReconnect && 
              !latestState.isBackgroundMode && 
              latestState.currentConfig &&
              latestState.connectionAttempts < latestState.maxRetries &&
              !isConnectingRef.current) {
            console.log('🔄 Scheduling auto-reconnection after unexpected disconnect...');
            scheduleReconnection();
          }
        }, 5000); // Increased to 5 seconds delay before attempting reconnection
      }
    });

    socketService.on('mqtt_reconnecting', (data) => {
      console.log('🔄 MQTT Reconnecting...');
      dispatch({ type: MQTT_ACTIONS.SET_MQTT_STATUS, payload: 'reconnecting' });
    });

    socketService.on('mqtt_error', (data) => {
      console.error('❌ MQTT Error:', data);
      isConnectingRef.current = false;
      
      dispatch({ type: MQTT_ACTIONS.SET_MQTT_STATUS, payload: 'error' });
      dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: data.message });
      
      // Increment connection attempts
      const currentState = stateRef.current;
      const newAttempts = currentState.connectionAttempts + 1;
      dispatch({ type: MQTT_ACTIONS.SET_CONNECTION_ATTEMPTS, payload: newAttempts });
      
      // Save failed connection state
      if (currentState.currentConfig) {
        saveConnectionState(currentState.currentConfig, false);
      }
      
      // Auto-reconnect if enabled and haven't exceeded max retries
      if (currentState.autoReconnect && 
          newAttempts < currentState.maxRetries && 
          currentState.currentConfig &&
          !isConnectingRef.current) {
        console.log(`🔄 Scheduling reconnection after error (attempt ${newAttempts}/${currentState.maxRetries})`);
        scheduleReconnection();
      } else if (newAttempts >= currentState.maxRetries) {
        console.log(`❌ Max retry attempts (${currentState.maxRetries}) reached. Stopping auto-reconnection.`);
        dispatch({ type: MQTT_ACTIONS.SET_AUTO_RECONNECT, payload: false });
        saveAutoReconnectSetting(false);
      }
    });

    socketService.on('mqtt_message', (data) => {
      dispatch({ type: MQTT_ACTIONS.SET_LAST_MESSAGE, payload: data });
      
      // Update device state based on message
      try {
        let value = data.message;
        try {
          value = JSON.parse(data.message);
        } catch (e) {
          // Keep as string if not JSON
        }
        
        dispatch({
          type: MQTT_ACTIONS.UPDATE_DEVICE_STATE,
          payload: {
            topic: data.topic,
            value: value,
          },
        });
      } catch (error) {
        console.error('Error processing MQTT message:', error);
      }
    });
  };

  // Schedule reconnection with exponential backoff
  const scheduleReconnection = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    const currentState = stateRef.current;
    
    // Don't schedule if already connected or connecting
    if (currentState.mqttStatus === 'connected' || isConnectingRef.current) {
      console.log('⚠️ Already connected or connecting, skipping reconnection schedule');
      return;
    }
    
    const baseDelay = 3000; // 3 seconds base delay
    const delay = Math.min(baseDelay * Math.pow(2, currentState.connectionAttempts), 30000); // Max 30 seconds
    
    console.log(`🔄 Scheduling MQTT reconnection in ${delay}ms (attempt ${currentState.connectionAttempts + 1}/${currentState.maxRetries})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      const latestState = stateRef.current;
      if (latestState.currentConfig && 
          latestState.autoReconnect && 
          latestState.connectionAttempts < latestState.maxRetries &&
          !isConnectingRef.current) {
        connectToMqttWithRetry(latestState.currentConfig);
      }
    }, delay);
  };

  // Connect to MQTT with retry logic
  const connectToMqttWithRetry = (config) => {
    const currentState = stateRef.current;
    
    // Check if already connected to prevent unnecessary connections
    if (currentState.mqttStatus === 'connected') {
      console.log('✅ Already connected to MQTT, skipping connection attempt');
      return;
    }
    
    if (currentState.connectionAttempts >= currentState.maxRetries) {
      console.log(`❌ Max retry attempts reached for MQTT connection`);
      return;
    }
    
    if (isConnectingRef.current) {
      console.log('⚠️ Connection already in progress, skipping new connection attempt');
      return;
    }
    
    console.log(`📡 Attempting MQTT connection (attempt ${currentState.connectionAttempts + 1}/${currentState.maxRetries})`);
    
    isConnectingRef.current = true;
    dispatch({ type: MQTT_ACTIONS.SET_MQTT_STATUS, payload: 'connecting' });
    dispatch({ type: MQTT_ACTIONS.SET_CURRENT_CONFIG, payload: config });
    dispatch({ type: MQTT_ACTIONS.CLEAR_ERROR });
    
    // Set connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    
    connectionTimeoutRef.current = setTimeout(() => {
      const latestState = stateRef.current;
      if (latestState.mqttStatus === 'connecting') {
        console.log('⏰ MQTT connection timeout');
        isConnectingRef.current = false;
        dispatch({ type: MQTT_ACTIONS.SET_MQTT_STATUS, payload: 'error' });
        dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: 'Hết thời gian kết nối' });
        
        // Increment attempts for timeout
        const newAttempts = latestState.connectionAttempts + 1;
        dispatch({ type: MQTT_ACTIONS.SET_CONNECTION_ATTEMPTS, payload: newAttempts });
        
        // Schedule reconnection if auto-reconnect is enabled
        if (latestState.autoReconnect && newAttempts < latestState.maxRetries) {
          scheduleReconnection();
        }
      }
    }, config.connectTimeout || 15000); // Reduced timeout to 15 seconds
    
    try {
      // Create a copy of config with unique clientId to avoid conflicts
      const uniqueConfig = {
        ...config,
        clientId: `${config.clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
      };
      
      console.log(`🔑 Using unique clientId: ${uniqueConfig.clientId}`);
      socketService.connectToMqtt(user._id, uniqueConfig);
    } catch (error) {
      console.error('Error initiating MQTT connection:', error);
      isConnectingRef.current = false;
      dispatch({ type: MQTT_ACTIONS.SET_MQTT_STATUS, payload: 'error' });
      dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Load initial data on authentication
  const loadInitialData = async () => {
    if (!user) return;

    try {
      await Promise.all([
        loadConfigs(),
        loadDevices(),
        loadRooms(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  // MQTT Configuration methods
  const loadConfigs = async () => {
    try {
      const configs = await apiService.getAllMqttConfigs(user._id);
      dispatch({ type: MQTT_ACTIONS.SET_CONFIGS, payload: configs });
      
      // Only set default config if there's no current config
      // This prevents unwanted config changes and loops
      if (!state.currentConfig) {
        const defaultConfig = configs.find(config => config.isDefault);
        if (defaultConfig) {
          console.log('📋 Setting default config as current:', defaultConfig.name);
          dispatch({ type: MQTT_ACTIONS.SET_CURRENT_CONFIG, payload: defaultConfig });
        }
      }
    } catch (error) {
      dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: 'Failed to load MQTT configurations' });
    }
  };

  const createConfig = async (configData) => {
    try {
      const newConfig = await apiService.createMqttConfig({
        ...configData,
        userId: user._id,
      });
      dispatch({ type: MQTT_ACTIONS.ADD_CONFIG, payload: newConfig });
      return newConfig;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create MQTT configuration';
      dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  };

  const updateConfig = async (configId, configData) => {
    try {
      const updatedConfig = await apiService.updateMqttConfig(configId, configData);
      dispatch({ type: MQTT_ACTIONS.UPDATE_CONFIG, payload: updatedConfig });
      return updatedConfig;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update MQTT configuration';
      dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  };

  const deleteConfig = async (configId) => {
    try {
      await apiService.deleteMqttConfig(configId);
      dispatch({ type: MQTT_ACTIONS.DELETE_CONFIG, payload: configId });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete MQTT configuration';
      dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  };

  const connectToMqtt = (config, forceReconnect = false) => {
    // Reset attempts if this is a manual connection
    if (forceReconnect) {
      dispatch({ type: MQTT_ACTIONS.RESET_CONNECTION_ATTEMPTS });
      dispatch({ type: MQTT_ACTIONS.SET_AUTO_RECONNECT, payload: true });
      saveAutoReconnectSetting(true);
      isConnectingRef.current = false; // Reset connecting flag
      clearTimeouts(); // Clear any pending reconnections
    }
    
    connectToMqttWithRetry(config);
  };

  const disconnectMqtt = async () => {
    console.log('🔌 Manually disconnecting MQTT...');
    
    // Disable auto-reconnect for manual disconnection
    dispatch({ type: MQTT_ACTIONS.SET_AUTO_RECONNECT, payload: false });
    await saveAutoReconnectSetting(false);
    
    // Clear any pending reconnection and reset flags
    clearTimeouts();
    isConnectingRef.current = false;
    
    // Disconnect MQTT broker specifically (this will send manual=true flag)
    socketService.disconnectMqtt(user._id);
    
    // Wait a bit for the manual disconnect to process
    setTimeout(() => {
      // Then disconnect socket completely
      socketService.disconnect();
    }, 500);
    
    // Update status and clear current config
    dispatch({ type: MQTT_ACTIONS.SET_MQTT_STATUS, payload: 'disconnected' });
    dispatch({ type: MQTT_ACTIONS.SET_CURRENT_CONFIG, payload: null });
    dispatch({ type: MQTT_ACTIONS.RESET_CONNECTION_ATTEMPTS });
    
    // Save disconnected state
    const currentState = stateRef.current;
    if (currentState.currentConfig) {
      await saveConnectionState(currentState.currentConfig, false);
    }
  };

  const toggleAutoReconnect = async (enabled) => {
    dispatch({ type: MQTT_ACTIONS.SET_AUTO_RECONNECT, payload: enabled });
    await saveAutoReconnectSetting(enabled);
    
    if (!enabled) {
      clearTimeouts();
    }
  };

  const saveAutoReconnectSetting = async (enabled) => {
    try {
      await secureStorage.setItem('mqtt_auto_reconnect', enabled);
    } catch (error) {
      console.error('Error saving auto-reconnect setting:', error);
    }
  };

  const testConnection = async (configData) => {
    try {
      const result = await apiService.testMqttConnection(configData);
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Kiểm tra kết nối thất bại';
      throw new Error(errorMessage);
    }
  };

  // Device methods
  const loadDevices = async (room = null) => {
    try {
      // If there's a current config, load devices for that config
      // Otherwise load devices for user
      if (state.currentConfig) {
        const devices = await apiService.getDevicesByConfig(state.currentConfig._id, user._id, room);
        dispatch({ type: MQTT_ACTIONS.SET_DEVICES, payload: devices });
      } else {
        const devices = await apiService.getDevices(user._id, room);
        dispatch({ type: MQTT_ACTIONS.SET_DEVICES, payload: devices });
      }
    } catch (error) {
      dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: 'Failed to load devices' });
    }
  };

  const refreshDevice = async (deviceId) => {
    try {
      console.log('🔄 Refreshing device from server:', deviceId);
      const refreshedDevice = await apiService.getDevice(deviceId);
      
      // Update the specific device in the context
      dispatch({ type: MQTT_ACTIONS.UPDATE_DEVICE, payload: refreshedDevice });
      console.log('✅ Device refreshed successfully:', refreshedDevice.name);
      
      return refreshedDevice;
    } catch (error) {
      console.error('❌ Failed to refresh device:', error);
      const errorMessage = error.response?.data?.error || 'Failed to refresh device state';
      dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  };

  const loadRooms = async () => {
    try {
      const rooms = await apiService.getRooms(user._id);
      dispatch({ type: MQTT_ACTIONS.SET_ROOMS, payload: rooms });
    } catch (error) {
      dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: 'Failed to load rooms' });
    }
  };

  const createDevice = async (deviceData) => {
    try {
      const newDevice = await apiService.createDevice({
        ...deviceData,
        userId: user._id,
      });
      dispatch({ type: MQTT_ACTIONS.ADD_DEVICE, payload: newDevice });
      await loadRooms(); // Refresh rooms
      return newDevice;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create device';
      dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  };

  const updateDevice = async (deviceId, deviceData) => {
    try {
      const updatedDevice = await apiService.updateDevice(deviceId, deviceData);
      dispatch({ type: MQTT_ACTIONS.UPDATE_DEVICE, payload: updatedDevice });
      return updatedDevice;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update device';
      dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  };

  const deleteDevice = async (deviceId) => {
    try {
      await apiService.deleteDevice(deviceId);
      dispatch({ type: MQTT_ACTIONS.DELETE_DEVICE, payload: deviceId });
      await loadRooms(); // Refresh rooms
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete device';
      dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  };

  const controlDevice = async (deviceId, command, value = null) => {
    try {
      const result = await apiService.controlDevice(deviceId, command, value);
      
      // Immediately update device state in context for UI responsiveness
      if (result && result.success) {
        updateDeviceState(deviceId, {
          value: result.currentValue !== undefined ? result.currentValue : 
                 (command === 'ON' ? 'ON' : command === 'OFF' ? 'OFF' : value),
          lastUpdated: new Date().toISOString(),
          online: true,
          synchronized: true
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to control device';
      dispatch({ type: MQTT_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  };

  const updateDeviceState = (deviceId, newState) => {
    dispatch({
      type: MQTT_ACTIONS.UPDATE_DEVICE_STATE,
      payload: { deviceId, newState }
    });
  };

  const clearError = () => {
    dispatch({ type: MQTT_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    loadConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    connectToMqtt,
    disconnectMqtt,
    toggleAutoReconnect,
    testConnection,
    loadDevices,
    refreshDevice,
    loadRooms,
    createDevice,
    updateDevice,
    deleteDevice,
    controlDevice,
    updateDeviceState,
    clearError,
  };

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>;
};

// Custom hook
export const useMqtt = () => {
  const context = useContext(MqttContext);
  if (!context) {
    throw new Error('useMqtt must be used within an MqttProvider');
  }
  return context;
};

export default MqttContext;
