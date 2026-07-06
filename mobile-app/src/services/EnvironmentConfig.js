// EnvironmentConfig.js - Environment Configuration Manager
import { Platform } from 'react-native';

class EnvironmentConfig {
  constructor() {
    this.config = this.loadConfiguration();
  }

  loadConfiguration() {
    // Load from .env file (processed by metro/babel)
    const config = {
      // Backend Configuration
      backendAutoDetect: process.env.BACKEND_AUTO_DETECT === 'true',
      backendPort: process.env.BACKEND_PORT || '3000',
      backendApiPath: process.env.BACKEND_API_PATH || '/api',
      
      // Network Discovery
      networkInterfacePriority: (process.env.NETWORK_INTERFACE_PRIORITY || 'wlo1,eth0,wlan0,en0').split(','),
      networkDiscoveryTimeout: parseInt(process.env.NETWORK_DISCOVERY_TIMEOUT || '5000'),
      maxDiscoveryAttempts: parseInt(process.env.MAX_DISCOVERY_ATTEMPTS || '3'),
      healthCheckEndpoint: process.env.HEALTH_CHECK_ENDPOINT || '/api/health',
      
      // URLs
      fallbackApiBaseUrl: process.env.FALLBACK_API_BASE_URL || 'http://localhost:3000/api',
      manualApiBaseUrl: process.env.MANUAL_API_BASE_URL,
      androidEmulatorApiUrl: process.env.ANDROID_EMULATOR_API_URL || 'http://10.0.2.2:3000/api',
      iosSimulatorApiUrl: process.env.IOS_SIMULATOR_API_URL || 'http://localhost:3000/api',
      
      // LyLy AI
      aiAssistantName: process.env.AI_ASSISTANT_NAME || 'LyLy AI Assistant',
      defaultLanguage: process.env.DEFAULT_LANGUAGE || 'vi-VN',
      
      // Features
      voiceInputEnabled: process.env.VOICE_INPUT_ENABLED === 'true',
      offlineModeEnabled: process.env.OFFLINE_MODE_ENABLED === 'true',
      debugNetworkDiscovery: process.env.DEBUG_NETWORK_DISCOVERY === 'true',
      
      // Environment
      isDevelopment: process.env.NODE_ENV === 'development',
      isDebug: __DEV__,
      platform: Platform.OS
    };

    console.log('🔧 Environment Configuration Loaded:');
    console.log('  Auto-detect backend:', config.backendAutoDetect);
    console.log('  Backend port:', config.backendPort);
    console.log('  Platform:', config.platform);
    console.log('  Development mode:', config.isDevelopment);
    console.log('  Debug network discovery:', config.debugNetworkDiscovery);

    return config;
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    console.log(`🔧 Config updated: ${key} = ${value}`);
  }

  // Get platform-specific API URL
  getPlatformApiUrl() {
    if (this.config.platform === 'android' && this.config.isDebug) {
      return this.config.androidEmulatorApiUrl;
    } else if (this.config.platform === 'ios' && this.config.isDebug) {
      return this.config.iosSimulatorApiUrl;
    }
    return this.config.fallbackApiBaseUrl;
  }

  // Get API configuration for current environment
  getApiConfig() {
    return {
      autoDetect: this.config.backendAutoDetect,
      port: this.config.backendPort,
      apiPath: this.config.backendApiPath,
      fallbackUrl: this.config.fallbackApiBaseUrl,
      manualUrl: this.config.manualApiBaseUrl,
      platformUrl: this.getPlatformApiUrl(),
      timeout: this.config.networkDiscoveryTimeout
    };
  }

  // Get network discovery configuration
  getNetworkConfig() {
    return {
      interfacePriority: this.config.networkInterfacePriority,
      discoveryTimeout: this.config.networkDiscoveryTimeout,
      maxAttempts: this.config.maxDiscoveryAttempts,
      healthEndpoint: this.config.healthCheckEndpoint,
      debugMode: this.config.debugNetworkDiscovery
    };
  }

  // Get LyLy AI configuration
  getAIConfig() {
    return {
      assistantName: this.config.aiAssistantName,
      defaultLanguage: this.config.defaultLanguage,
      voiceEnabled: this.config.voiceInputEnabled,
      offlineEnabled: this.config.offlineModeEnabled
    };
  }

  // Update configuration at runtime
  updateConfig(updates) {
    Object.assign(this.config, updates);
    console.log('🔧 Configuration updated:', updates);
  }

  // Reset to defaults
  reset() {
    this.config = this.loadConfiguration();
    console.log('🔧 Configuration reset to defaults');
  }

  // Export current configuration (for debugging)
  exportConfig() {
    return { ...this.config };
  }
}

// Export singleton instance
export default new EnvironmentConfig();
