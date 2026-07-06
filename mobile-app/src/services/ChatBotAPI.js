import axios from 'axios';
import { secureStorage } from '../utils';
import NetworkDiscovery from './NetworkDiscovery';

class ChatBotAPI {
  constructor() {
    this.apiClient = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._performInitialization();
    await this.initPromise;
  }

  async _performInitialization() {
    console.log('🤖 Initializing ChatBot API with network discovery...');
    
    try {
      const endpoint = await NetworkDiscovery.discoverBackendEndpoint();
      
      if (!endpoint) {
        throw new Error('Could not discover backend endpoint');
      }

      this.apiClient = axios.create({
        baseURL: endpoint.baseURL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.setupInterceptors();
      this.isInitialized = true;
      console.log('✅ ChatBot API initialized with:', endpoint.baseURL);
      this.startNetworkMonitoring();
      
    } catch (error) {
      console.error('❌ Failed to initialize ChatBot API:', error);
      this.createFallbackClient();
    }
  }

  createFallbackClient() {
    const fallbackURL = process.env.FALLBACK_API_BASE_URL || 'http://localhost:3000/api';
    
    this.apiClient = axios.create({
      baseURL: fallbackURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.isInitialized = true;
    console.log('🔄 Using fallback API client:', fallbackURL);
  }

  startNetworkMonitoring() {
    NetworkDiscovery.startNetworkMonitoring(async (newEndpoint) => {
      if (newEndpoint && newEndpoint.baseURL !== this.apiClient.defaults.baseURL) {
        console.log('🔄 Network changed, updating API client to:', newEndpoint.baseURL);
        this.apiClient.defaults.baseURL = newEndpoint.baseURL;
      }
    });
  }

  setupInterceptors() {
    this.apiClient.interceptors.request.use(
      async (config) => {
        const token = await this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('ChatBot API Error:', error);
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  async getAuthToken() {
    try {
      return await secureStorage.getItem('user_token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  handleApiError(error) {
    if (error.response) {
      return {
        message: error.response.data?.message || 'Server error occurred',
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      return {
        message: 'Lỗi mạng - vui lòng kiểm tra kết nối của bạn',
        status: 0,
      };
    } else {
      return {
        message: error.message || 'An unexpected error occurred',
        status: -1,
      };
    }
  }

  // Main chat method - Enhanced for NAVIN-AGENT-AI with Real Database Integration
  async sendMessage(message, iotContext = {}) {
    await this.initialize();

    try {
      console.log('🤖 Sending message to NAVIN-AGENT-AI backend:', { 
        message: message.substring(0, 50) + '...',
        hasIotContext: !!iotContext.devices 
      });

      const userId = iotContext.currentUserId || await this.getCurrentUserId();

      const requestPayload = {
        message: message.trim(),
        userId: userId,
        context: {
          timestamp: new Date().toISOString(),
          platform: 'mobile',
          hasDevices: !!(iotContext.devices && iotContext.devices.length > 0),
          deviceCount: iotContext.devices ? iotContext.devices.length : 0,
          mqttConnected: iotContext.mqttStatus?.connected || false
        }
      };

      console.log('📤 Backend request:', {
        message: requestPayload.message.substring(0, 30) + '...',
        userId: requestPayload.userId,
        deviceCount: requestPayload.context.deviceCount,
        mqttConnected: requestPayload.context.mqttConnected
      });

      const response = await this.apiClient.post('/chatbot/chat', requestPayload);

      if (response.data && response.data.success) {
        const responseData = response.data.data;
        
        console.log('✅ Backend response received:', {
          intent: responseData.intent,
          type: responseData.type,
          hasDeviceControl: !!responseData.deviceControl,
          responseTime: responseData.responseTime
        });

        if (responseData.deviceControl && responseData.deviceControl.success) {
          console.log('🎯 Device control executed via backend:', {
            deviceName: responseData.deviceControl.deviceName,
            action: responseData.deviceControl.action,
            value: responseData.deviceControl.value
          });
        }

        return {
          success: true,
          response: responseData.response,
          intent: responseData.intent || 'general',
          type: responseData.type || 'text',
          timestamp: responseData.timestamp,
          deviceControl: responseData.deviceControl || null,
          responseTime: responseData.responseTime
        };
      } else {
        throw new Error(response.data?.error || 'Invalid response from backend');
      }

    } catch (error) {
      console.error('❌ Backend ChatBot API error:', error);
      console.log('🔄 Falling back to local device control processing...');
      return await this.processMessageLocally(message, iotContext);
    }
  }

  async getCurrentUserId() {
    try {
      const token = await this.getAuthToken();
      if (token) {
        const userData = await secureStorage.getItem('user_data');
        if (userData) {
          try {
            const parsedData = JSON.parse(userData);
            const userId = parsedData.userId || parsedData.id;
            if (userId) {
              return userId;
            }
          } catch (parseError) {
            console.warn('Failed to parse user_data JSON, clearing invalid data:', parseError);
            await secureStorage.removeItem('user_data');
          }
        }
      }
      
      // Generate a proper anonymous ID that persists per device
      let anonymousId = await secureStorage.getItem('anonymous_user_id');
      if (!anonymousId) {
        anonymousId = 'anonymous_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await secureStorage.setItem('anonymous_user_id', anonymousId);
        console.log('Created new anonymous user ID:', anonymousId);
      }
      return anonymousId;
    } catch (error) {
      console.error('Error getting user ID:', error);
      // Last resort fallback - should be very rare
      return 'fallback_user_' + Date.now();
    }
  }

  async processMessageLocally(message, iotContext = {}) {
    const lowerMessage = message.toLowerCase();
    let response = '';
    let intent = 'general';
    let type = 'text';
    let metadata = null;

    if (this.isDeviceControlCommand(lowerMessage)) {
      const deviceControl = this.parseDeviceControl(lowerMessage, iotContext.devices || []);
      if (deviceControl) {
        intent = 'device_control';
        response = deviceControl.response;
        metadata = { 
          deviceId: deviceControl.deviceId, 
          action: deviceControl.action,
          needsDeviceControl: true,
          deviceName: deviceControl.deviceName,
          command: deviceControl.command,
          value: deviceControl.value
        };
      } else {
        response = 'Tôi không tìm thấy thiết bị phù hợp. Vui lòng kiểm tra tên thiết bị và thử lại.';
      }
    } else if (lowerMessage.includes('mqtt') || lowerMessage.includes('kết nối')) {
      if (iotContext.mqttStatus?.connected) {
        response = `🔗 MQTT Status: Kết nối thành công ✅\n`;
        response += `📡 Broker: ${iotContext.currentConnection?.name || 'Unknown'}\n`;
        response += `🌐 Host: ${iotContext.currentConnection?.host || 'Unknown'}\n`;
        response += `⚡ Trạng thái: Hoạt động và ổn định`;
      } else {
        response = "🔗 MQTT Status: Ngắt kết nối ❌\n\n";
        response += "Bạn hiện chưa kết nối với bất kỳ MQTT broker nào. Tôi có thể giúp bạn:\n";
        response += "• Hướng dẫn thiết lập MQTT\n";
        response += "• Khắc phục sự cố kết nối\n";
        response += "• Đề xuất cấu hình broker";
      }
      intent = 'mqtt_status';
    } else if (lowerMessage.includes('thiết bị') || lowerMessage.includes('device')) {
      if (iotContext.devices && iotContext.devices.length > 0) {
        response = `📱 Bạn có ${iotContext.devices.length} thiết bị được kết nối:\n\n`;
        response += iotContext.devices.map(device => 
          `• ${device.name} (${device.widgetType}) - ${device.currentState?.online ? 'Trực tuyến' : 'Ngoại tuyến'}`
        ).join('\n');
        response += `\n\n💡 Bạn có thể điều khiển bằng giọng nói: "Bật đèn phòng khách" hoặc "Tắt quạt phòng ngủ"`;
      } else {
        response = "📱 Chưa có thiết bị nào được kết nối.\n\n";
        response += "Để bắt đầu:\n";
        response += "• Thêm thiết bị qua tab Devices\n";
        response += "• Kiểm tra nguồn điện và mạng\n";
        response += "• Đảm bảo MQTT được cấu hình đúng";
      }
      intent = 'device_status';
    } else if (lowerMessage.includes('xin chào') || lowerMessage.includes('hello') || 
               lowerMessage.includes('chào') || lowerMessage.includes('hi')) {
      const timeGreeting = this.getTimeBasedGreeting();
      response = `${timeGreeting}! Tôi là LyLy - Trợ lý IoT thông minh của bạn 🤖\n\n`;
      response += `**Trạng thái nhanh:**\n`;
      response += `📱 Thiết bị: ${iotContext.devices?.length || 0} được kết nối\n`;
      response += `🔗 MQTT: ${iotContext.mqttStatus?.connected ? 'Đã kết nối' : 'Ngắt kết nối'}\n`;
      response += `💚 Hệ thống: ${iotContext.mqttStatus?.connected && iotContext.devices?.length > 0 ? 'Hoạt động tốt' : 'Cần thiết lập'}\n\n`;
      response += `Tôi có thể giúp bạn điều khiển thiết bị, kiểm tra trạng thái và khắc phục sự cố! 🏠✨`;
      intent = 'greeting';
    } else {
      response = `Tôi hiểu bạn đang nói "${message}". `;
      response += `Tuy nhiên, tôi chưa thể xử lý yêu cầu này.\n\n`;
      response += `💡 **Gợi ý:** Hãy thử hỏi:\n`;
      response += `• "Bật đèn phòng khách"\n`;
      response += `• "Hiển thị thiết bị của tôi"\n`;
      response += `• "Trạng thái hệ thống như thế nào?"\n`;
      response += `• "Bạn có thể giúp gì?"\n\n`;
      response += `Tôi sẽ học hỏi và cải thiện để phục vụ bạn tốt hơn! 🚀`;
      intent = 'general';
    }

    return {
      success: true,
      response: response,
      intent: intent,
      type: type,
      metadata: metadata,
      isLocal: true,
      timestamp: new Date().toISOString()
    };
  }

  isDeviceControlCommand(lowerMessage) {
    const controlKeywords = [
      'bật', 'tắt', 'mở', 'đóng', 'điều chỉnh', 'đặt', 'chỉnh',
      'turn on', 'turn off', 'open', 'close', 'set', 'adjust'
    ];
    
    const deviceKeywords = [
      'đèn', 'quạt', 'điều hòa', 'máy lạnh', 'cửa', 'garage', 'bóng đèn',
      'light', 'fan', 'air conditioner', 'ac', 'door', 'bulb', 'switch'
    ];
    
    const hasControlKeyword = controlKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasDeviceKeyword = deviceKeywords.some(keyword => lowerMessage.includes(keyword));
    
    return hasControlKeyword && hasDeviceKeyword;
  }

  parseDeviceControl(lowerMessage, devices) {
    const actionMapping = {
      'bật': { action: 'ON', actionText: 'bật' },
      'mở': { action: 'ON', actionText: 'mở' },
      'tắt': { action: 'OFF', actionText: 'tắt' },
      'đóng': { action: 'OFF', actionText: 'đóng' },
      'turn on': { action: 'ON', actionText: 'bật' },
      'turn off': { action: 'OFF', actionText: 'tắt' },
      'open': { action: 'ON', actionText: 'mở' },
      'close': { action: 'OFF', actionText: 'đóng' }
    };
    
    let detectedAction = null;
    for (const [keyword, actionInfo] of Object.entries(actionMapping)) {
      if (lowerMessage.includes(keyword)) {
        detectedAction = actionInfo;
        break;
      }
    }
    
    if (!detectedAction) {
      detectedAction = { action: 'ON', actionText: 'bật' };
    }
    
    let matchedDevice = null;
    
    for (const device of devices) {
      if (lowerMessage.includes(device.name.toLowerCase())) {
        matchedDevice = device;
        break;
      }
    }
    
    if (!matchedDevice) {
      for (const device of devices) {
        if (device.room && lowerMessage.includes(device.room.toLowerCase())) {
          matchedDevice = device;
          break;
        }
      }
    }
    
    if (!matchedDevice) {
      const deviceTypeMapping = {
        'đèn': ['switch', 'button'],
        'quạt': ['fan', 'switch'],
        'điều hòa': ['ac', 'switch'],
        'máy lạnh': ['ac', 'switch'],
        'cửa': ['door', 'switch'],
        'light': ['switch', 'button'],
        'fan': ['switch', 'button'],
        'door': ['switch', 'button']
      };
      
      for (const [keyword, types] of Object.entries(deviceTypeMapping)) {
        if (lowerMessage.includes(keyword)) {
          matchedDevice = devices.find(device => 
            types.includes(device.widgetType) || 
            device.name.toLowerCase().includes(keyword)
          );
          break;
        }
      }
    }
    
    if (!matchedDevice) {
      return null;
    }
    
    let value = detectedAction.action;
    const numberMatch = lowerMessage.match(/(\d+)/);
    if (numberMatch && matchedDevice.widgetType === 'slider') {
      value = parseInt(numberMatch[1]);
    }
    
    return {
      deviceId: matchedDevice.id,
      deviceName: matchedDevice.name,
      action: detectedAction.action,
      command: detectedAction.action,
      value: value,
      response: `Đã ${detectedAction.actionText} ${matchedDevice.name} thành công.`
    };
  }

  getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 17) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }
}

export default new ChatBotAPI();
