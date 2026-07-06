// NetworkDiscovery.js - Smart Network Detection for NAVIN-AGENT-AI
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import EnvironmentConfig from './EnvironmentConfig';

class NetworkDiscovery {
  constructor() {
    this.discoveredEndpoints = new Map();
    this.currentConnection = null;
    this.isDiscovering = false;
    this.config = EnvironmentConfig.getNetworkConfig();
  }

  /**
   * Auto-discover backend server on local network
   * Similar to backend's network interface detection
   */
  async discoverBackendEndpoint() {
    console.log('🔍 Starting network discovery for NAVIN-AGENT-AI backend...');
    
    if (this.isDiscovering) {
      console.log('⚠️ Discovery already in progress, waiting...');
      return this.waitForDiscovery();
    }

    this.isDiscovering = true;

    try {
      // Get network info
      const networkState = await NetInfo.fetch();
      console.log('📡 Network state:', networkState);

      // Platform-specific discovery
      const endpoints = await this.getPlatformSpecificEndpoints(networkState);
      
      // Test each endpoint
      const workingEndpoint = await this.testEndpoints(endpoints);
      
      if (workingEndpoint) {
        this.currentConnection = workingEndpoint;
        console.log('✅ Backend discovered:', workingEndpoint);
        return workingEndpoint;
      } else {
        console.log('❌ No working backend found, using fallback');
        return this.getFallbackEndpoint();
      }
    } catch (error) {
      console.error('❌ Network discovery failed:', error);
      return this.getFallbackEndpoint();
    } finally {
      this.isDiscovering = false;
    }
  }

  async getPlatformSpecificEndpoints(networkState) {
    const apiConfig = EnvironmentConfig.getApiConfig();
    const endpoints = [];

    // Environment-based configuration
    if (!apiConfig.autoDetect) {
      // Manual configuration
      if (apiConfig.manualUrl) {
        endpoints.push({
          baseURL: apiConfig.manualUrl,
          source: 'manual_config',
          priority: 1
        });
      }
      return endpoints;
    }

    // Platform-specific endpoints
    if (Platform.OS === 'android') {
      // Android Emulator
      if (__DEV__) {
        endpoints.push({
          baseURL: apiConfig.platformUrl,
          source: 'android_emulator',
          priority: 2
        });
      }
    } else if (Platform.OS === 'ios') {
      // iOS Simulator
      if (__DEV__) {
        endpoints.push({
          baseURL: apiConfig.platformUrl,
          source: 'ios_simulator',
          priority: 2
        });
      }
    }

    // Generate local network IP ranges to scan
    if (networkState.details && networkState.details.ipAddress) {
      const localIP = networkState.details.ipAddress;
      console.log('📱 Device IP:', localIP);
      
      // Extract network base (e.g., 192.168.1.x -> 192.168.1)
      const networkBase = localIP.substring(0, localIP.lastIndexOf('.'));
      
      // Common router/gateway IPs that might run the backend
      const commonIPs = [
        '1', '2', '100', '101', '102', '103', '104', '105', 
        '110', '111', '150', '200', '254'
      ];
      
      commonIPs.forEach(lastOctet => {
        const testIP = `${networkBase}.${lastOctet}`;
        endpoints.push({
          baseURL: `http://${testIP}:${apiConfig.port}${apiConfig.apiPath}`,
          source: 'local_network_scan',
          priority: 3
        });
      });
    }

    // Common development IPs
    const commonDevIPs = [
      '192.168.1.100', '192.168.1.101', '192.168.1.102',
      '192.168.0.100', '192.168.0.101', '192.168.0.102',
      '10.0.1.100', '10.0.1.101',
      '172.16.3.92' // Current backend IP from logs
    ];

    commonDevIPs.forEach(ip => {
      endpoints.push({
        baseURL: `http://${ip}:${apiConfig.port}${apiConfig.apiPath}`,
        source: 'common_dev_ips',
        priority: 4
      });
    });

    // Sort by priority
    return endpoints.sort((a, b) => a.priority - b.priority);
  }

  async testEndpoints(endpoints) {
    console.log(`🧪 Testing ${endpoints.length} potential endpoints...`);
    
    const healthEndpoint = this.config.healthEndpoint;

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Testing: ${endpoint.baseURL} (${endpoint.source})`);
        
        const healthURL = endpoint.baseURL.replace('/api', '') + healthEndpoint;
        
        const response = await this.fetchWithTimeout(healthURL, { timeout: this.config.discoveryTimeout });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Working endpoint found: ${endpoint.baseURL}`);
          console.log(`📊 Health check response:`, data);
          
          return {
            ...endpoint,
            healthData: data,
            testedAt: new Date().toISOString()
          };
        }
      } catch (error) {
        console.log(`❌ ${endpoint.baseURL} failed:`, error.message);
        continue;
      }
    }

    return null;
  }

  async fetchWithTimeout(url, options = {}) {
    const timeout = options.timeout || 5000;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  getFallbackEndpoint() {
    const apiConfig = EnvironmentConfig.getApiConfig();
    
    console.log('🔄 Using fallback endpoint:', apiConfig.fallbackUrl);
    
    return {
      baseURL: apiConfig.fallbackUrl,
      source: 'fallback',
      priority: 999,
      isFallback: true
    };
  }

  async waitForDiscovery() {
    // Wait for discovery to complete
    while (this.isDiscovering) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.currentConnection;
  }

  /**
   * Get current working endpoint
   */
  getCurrentEndpoint() {
    return this.currentConnection;
  }

  /**
   * Force rediscovery (useful when network changes)
   */
  async rediscover() {
    this.currentConnection = null;
    this.discoveredEndpoints.clear();
    return this.discoverBackendEndpoint();
  }

  /**
   * Monitor network changes and auto-rediscover
   */
  startNetworkMonitoring(onNetworkChange) {
    return NetInfo.addEventListener(state => {
      console.log('📡 Network state changed:', state);
      
      if (state.isConnected && this.currentConnection) {
        // Test current connection
        this.testCurrentConnection().then(isWorking => {
          if (!isWorking) {
            console.log('🔄 Current connection failed, rediscovering...');
            this.rediscover().then(newEndpoint => {
              if (onNetworkChange) {
                onNetworkChange(newEndpoint);
              }
            });
          }
        });
      }
    });
  }

  async testCurrentConnection() {
    if (!this.currentConnection) return false;
    
    try {
      const healthURL = this.currentConnection.baseURL.replace('/api', '') + '/api/health';
      const response = await this.fetchWithTimeout(healthURL, { timeout: 3000 });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export default new NetworkDiscovery();
