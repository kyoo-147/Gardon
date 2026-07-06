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
      // Discover backend endpoint
      const endpoint = await NetworkDiscovery.discoverBackendEndpoint();
      
      if (!endpoint) {
        throw new Error('Could not discover backend endpoint');
      }

      // Create axios client with discovered endpoint
      this.apiClient = axios.create({
        baseURL: endpoint.baseURL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Add request/response interceptors
      this.setupInterceptors();

      this.isInitialized = true;
      console.log('✅ ChatBot API initialized with:', endpoint.baseURL);
      
      // Start network monitoring
      this.startNetworkMonitoring();
      
    } catch (error) {
      console.error('❌ Failed to initialize ChatBot API:', error);
      
      // Create fallback client
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
        
        // Update base URL
        this.apiClient.defaults.baseURL = newEndpoint.baseURL;
      }
    });
  }

  setupInterceptors() {
    // Request interceptor
    this.apiClient.interceptors.request.use(
      async (config) => {
        // Add authentication token if available
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

    // Response interceptor
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('ChatBot API Error:', error);
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  async getAuthToken() {
    // Get authentication token from secure storage
    try {
      return await secureStorage.getItem('user_token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  handleApiError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.message || 'Server error occurred',
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'Lỗi mạng - vui lòng kiểm tra kết nối của bạn',
        status: 0,
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
        status: -1,
      };
    }
  }

  // Get current user ID helper method
  getCurrentUserId() {
    // This would typically get from auth context or storage
    return 'user_' + Date.now(); // Temporary implementation
  }

  // Main chat method - Updated for NAVIN-AGENT-AI with Real Database Integration
  async sendMessage(message, iotContext = {}) {
    await this.initialize();

    try {
      console.log('🤖 Sending message to NAVIN-AGENT-AI backend:', { message, hasIotContext: !!iotContext.devices });

      // Get current user ID from context or auth
      const userId = iotContext.currentUserId || await this.getCurrentUserId();

      // Prepare request payload for backend
      const requestPayload = {
        message: message.trim(),
        userId: userId,
        context: {
          timestamp: new Date().toISOString(),
          platform: 'mobile',
          // Include minimal IoT context for backend reference
          hasDevices: !!(iotContext.devices && iotContext.devices.length > 0),
          deviceCount: iotContext.devices ? iotContext.devices.length : 0,
          mqttConnected: iotContext.mqttStatus?.connected || false
        }
      };

      console.log('📤 Backend request payload:', {
        message: requestPayload.message,
        userId: requestPayload.userId,
        context: requestPayload.context
      });

      // Send to NAVIN-AGENT-AI backend
      const response = await this.apiClient.post('/chatbot/chat', requestPayload);

      if (response.data && response.data.success) {
        const responseData = response.data.data;
        
        console.log('✅ Backend response received:', {
          intent: responseData.intent,
          type: responseData.type,
          hasDeviceControl: !!responseData.deviceControl,
          responseTime: responseData.responseTime
        });

        // Handle device control responses
        if (responseData.deviceControl && responseData.deviceControl.success) {
          console.log('🎯 Device control executed via backend:', {
            deviceName: responseData.deviceControl.deviceName,
            action: responseData.deviceControl.action,
            value: responseData.deviceControl.value
          });
        }

        return {
          response: responseData.response,
          intent: responseData.intent || 'general',
          type: responseData.type || 'text',
          success: true,
          timestamp: responseData.timestamp,
          deviceControl: responseData.deviceControl || null,
          responseTime: responseData.responseTime
        };
      } else {
        throw new Error(response.data?.error || 'Invalid response from backend');
      }

    } catch (error) {
      console.error('❌ Backend ChatBot API error:', error);

      // Fallback to local processing if backend fails
      console.log('🔄 Falling back to local device control processing...');
      return await this.processMessageLocally(message, iotContext);
    }
  }

  // Get current user ID - updated to get from auth or use default
  async getCurrentUserId() {
    try {
      // Try to get from auth token or storage
      const token = await this.getAuthToken();
      if (token) {
        // Decode token to get user ID (simplified)
        const userData = await secureStorage.getItem('user_data');
        if (userData) {
          const parsedData = JSON.parse(userData);
          return parsedData.userId || parsedData.id || 'anonymous_user';
        }
      }
      
      // Fallback to a consistent anonymous ID
      let anonymousId = await secureStorage.getItem('anonymous_user_id');
      if (!anonymousId) {
        anonymousId = 'anonymous_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await secureStorage.setItem('anonymous_user_id', anonymousId);
      }
      return anonymousId;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return 'anonymous_user';
  // Fallback local processing when backend is unavailable
  async processMessageLocally(message, iotContext = {}) {
    
    try {
      const response = await this.apiClient.post('/chatbot/chat', {
        message: message, // Use 'message' field as backend expects
        userId: this.getCurrentUserId(),
        context: {
          ...iotContext,
          timestamp: new Date().toISOString(),
          source: 'mobile-app',
          hasIoTDevices: (iotContext.devices && iotContext.devices.length > 0),
          mqttConnected: iotContext.mqttStatus === 'connected'
        },
        timestamp: new Date().toISOString()
      });

      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data.response,
          intent: response.data.data.intent,
          type: response.data.data.type,
          responseTime: response.data.data.responseTime,
          // Device control specific fields
          ...(response.data.data.deviceId && { deviceId: response.data.data.deviceId }),
          ...(response.data.data.action && { action: response.data.data.action }),
          ...(response.data.data.deviceName && { deviceName: response.data.data.deviceName }),
          ...(response.data.data.needsDeviceControl && { needsDeviceControl: response.data.data.needsDeviceControl }),
          ...(response.data.data.controlResult && { controlResult: response.data.data.controlResult })
        };
      } else {
        throw new Error(response.data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('ChatBot API sendMessage error:', error);
      
      // Fallback to local processing if API fails with IoT context
      const localResponse = await this.processMessageLocally(message, iotContext);
      return {
        success: true,
        data: localResponse.response,
        intent: localResponse.intent,
        isLocal: true,
      };
    }
  }

  // Streaming chat method for real-time responses
  async sendMessageStream(content, onChunk, onComplete, onError) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.apiClient.defaults.baseURL}/chatbot/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: content,
          userId: this.getCurrentUserId(),
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                if (onError) onError(new Error(data.error));
                return;
              }
              
              if (data.chunk && onChunk) {
                onChunk(data.chunk);
              }
              
              if (data.done && onComplete) {
                onComplete(data.complete || '');
                return;
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      if (onError) onError(error);
    }
  }

  async processMessageLocally(message, context = {}) {
    const lowerMessage = message.toLowerCase();
    let response = '';
    let intent = 'general';
    let type = 'text';
    let metadata = null;

    // Device control commands - Vietnamese and English
    if (this.isDeviceControlCommand(lowerMessage)) {
      const deviceControl = this.parseDeviceControl(lowerMessage, context.devices || []);
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
        response = "Tôi không tìm thấy thiết bị nào phù hợp để điều khiển. Vui lòng kiểm tra tên thiết bị và thử lại.";
      }
    }
    // Device status queries
    else if (lowerMessage.includes('device') || lowerMessage.includes('thiết bị') || 
             lowerMessage.includes('trạng thái')) {
      intent = 'device_status';
      if (context.devices && context.devices.length > 0) {
        response = `📱 Anh/chị có ${context.devices.length} thiết bị đã kết nối:\n\n`;
        response += context.devices.map((device, index) => {
          const status = device.currentState?.online ? '🟢 Hoạt động' : '🔴 Offline';
          const value = device.currentState?.value !== undefined ? 
            ` - Giá trị: ${device.currentState.value}` : '';
          return `${index + 1}. ${device.name} (${device.room})${value}\n   Status: ${status}`;
        }).join('\n\n');
        
        response += '\n\nAnh/chị có muốn điều khiển thiết bị nào không?';
      } else {
        response = "Anh/chị chưa có thiết bị nào được kết nối. Tôi có thể hướng dẫn anh/chị thêm thiết bị mới.";
      }
    }
    // MQTT connection queries
    else if (lowerMessage.includes('mqtt') || lowerMessage.includes('kết nối') || 
             lowerMessage.includes('connection')) {
      intent = 'mqtt_status';
      if (context.mqttStatus === 'connected') {
        response = `🟢 MQTT đang kết nối:\n`;
        response += `📡 Broker: ${context.currentConfig?.name || 'Unknown'}\n`;
        response += `🌐 Host: ${context.currentConfig?.host || 'Unknown'}\n`;
        response += `✅ Trạng thái: Hoạt động bình thường`;
      } else {
        response = "🔴 MQTT chưa kết nối\n";
        response += "Anh/chị cần kết nối MQTT để điều khiển thiết bị IoT. Tôi có thể hướng dẫn anh/chị thiết lập kết nối.";
      }
    }
    // Status queries
    else if (lowerMessage.includes('status') || lowerMessage.includes('overview')) {
      response = `📊 System Overview:\n\n`;
      response += `🔗 MQTT: ${context.currentConnection?.connected ? 'Connected' : 'Disconnected'}\n`;
      response += `📱 Devices: ${context.deviceCount || 0} connected\n`;
      
      if (context.devices && context.devices.length > 0) {
        const activeDevices = context.devices.filter(d => d.status === 'online' || d.status === 'active').length;
        response += `⚡ Active Devices: ${activeDevices}/${context.devices.length}\n`;
      }
      
      response += `\nEverything looks ${context.currentConnection?.connected && context.deviceCount > 0 ? 'good' : 'like it needs attention'}!`;
    }
    // System overview
    else if (lowerMessage.includes('tổng quan') || lowerMessage.includes('status') || 
             lowerMessage.includes('overview') || lowerMessage.includes('hệ thống')) {
      intent = 'system_status';
      response = `📊 Tổng quan hệ thống IoT:\n\n`;
      
      // MQTT Status
      const mqttIcon = context.mqttStatus === 'connected' ? '🟢' : '🔴';
      response += `${mqttIcon} MQTT: ${context.mqttStatus === 'connected' ? 'Đã kết nối' : 'Chưa kết nối'}\n`;
      
      // Device Status
      const deviceCount = context.devices?.length || 0;
      const onlineDevices = context.devices?.filter(d => d.currentState?.online).length || 0;
      response += `📱 Thiết bị: ${onlineDevices}/${deviceCount} đang hoạt động\n`;
      
      // Room distribution
      if (context.rooms?.length > 0) {
        response += `🏠 Phòng: ${context.rooms.length} phòng được cấu hình\n`;
      }
      
      const systemHealth = context.mqttStatus === 'connected' && onlineDevices > 0 ? 
        'tốt' : 'cần kiểm tra';
      response += `\n💡 Tình trạng tổng thể: ${systemHealth}`;
      
      if (systemHealth === 'cần kiểm tra') {
        response += '\n\nTôi có thể giúp anh/chị khắc phục sự cố nếu cần.';
      }
    }
    // Help queries
    else if (lowerMessage.includes('help') || lowerMessage.includes('giúp') || 
             lowerMessage.includes('hướng dẫn') || lowerMessage.includes('làm gì')) {
      intent = 'help';
      response = `🤖 Chào anh/chị! Tôi là LyLy - trợ lý IoT thông minh.\n\n`;
      response += `📱 Tôi có thể giúp anh/chị:\n\n`;
      response += `🔧 Điều khiển thiết bị:\n`;
      response += `  • "Bật đèn phòng khách"\n`;
      response += `  • "Tắt quạt phòng ngủ"\n`;
      response += `  • "Kiểm tra trạng thái thiết bị"\n\n`;
      response += `📊 Giám sát hệ thống:\n`;
      response += `  • "Tình trạng MQTT"\n`;
      response += `  • "Tổng quan hệ thống"\n`;
      response += `  • "Danh sách thiết bị"\n\n`;
      response += `🛠 Hỗ trợ kỹ thuật:\n`;
      response += `  • "Có vấn đề gì đó"\n`;
      response += `  • "Khắc phục sự cố"\n`;
      response += `  • "Thiết bị không hoạt động"\n\n`;
      response += `Anh/chị cứ nói tự nhiên, tôi sẽ hiểu! 😊`;
    }
    // Troubleshooting
    else if (lowerMessage.includes('lỗi') || lowerMessage.includes('sự cố') || 
             lowerMessage.includes('problem') || lowerMessage.includes('không hoạt động')) {
      intent = 'troubleshooting';
      response = `🔧 Chẩn đoán hệ thống:\n\n`;
      
      const issues = [];
      if (context.mqttStatus !== 'connected') {
        issues.push("❌ Mất kết nối MQTT");
      }
      if (!context.devices || context.devices.length === 0) {
        issues.push("❌ Không có thiết bị nào được kết nối");
      } else {
        const offlineDevices = context.devices.filter(d => !d.currentState?.online);
        if (offlineDevices.length > 0) {
          issues.push(`❌ ${offlineDevices.length} thiết bị đang offline`);
        }
      }
      
      if (issues.length > 0) {
        response += `Tôi phát hiện các vấn đề:\n${issues.join('\n')}\n\n`;
        response += `💡 Giải pháp đề xuất:\n`;
        response += `1. Kiểm tra kết nối internet\n`;
        response += `2. Xác minh cài đặt MQTT broker\n`;
        response += `3. Khởi động lại ứng dụng nếu cần\n`;
        response += `4. Kiểm tra nguồn điện thiết bị`;
      } else {
        response = "✅ Hệ thống đang hoạt động bình thường!\n\n";
        response += "Tất cả thiết bị và kết nối đều ổn định. Anh/chị có cần hỗ trợ gì khác không?";
      }
    }
    // Greetings
    else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') ||
             lowerMessage.includes('chào') || lowerMessage.includes('xin chào')) {
      intent = 'greeting';
      const timeGreeting = this.getTimeBasedGreeting();
      response = `${timeGreeting}! Tôi là LyLy - trợ lý IoT của anh/chị. 🤖\n\n`;
      response += `📊 Trạng thái nhanh:\n`;
      response += `📱 ${context.devices?.length || 0} thiết bị\n`;
      response += `🔗 MQTT: ${context.mqttStatus === 'connected' ? 'Kết nối' : 'Chưa kết nối'}\n\n`;
      response += `Tôi có thể giúp anh/chị điều khiển thiết bị, kiểm tra trạng thái hoặc khắc phục sự cố. Hãy nói với tôi điều gì anh/chị cần!`;
    }
    // Default response
    else {
      intent = 'general';
      response = "Tôi hiểu anh/chị muốn hỏi điều gì đó, nhưng tôi chưa rõ yêu cầu cụ thể. Anh/chị có thể nói rõ hơn được không? 🤔\n\n";
      response += "Ví dụ:\n";
      response += "• 'Bật đèn phòng khách'\n";
      response += "• 'Kiểm tra trạng thái thiết bị'\n";
      response += "• 'Tình trạng MQTT như thế nào?'";
    }

    return {
      response,
      intent,
      type,
      ...(metadata && { metadata })
    };
  }

  // Get conversation history with new API
  async getConversationHistory(limit = 10) {
    try {
      const response = await this.apiClient.get('/chatbot/history', {
        params: { limit },
      });
      
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return {
        success: false,
        error: this.handleApiError(error),
      };
    }
  }

  // Get analytics (admin only)
  async getAnalytics() {
    try {
      const response = await this.apiClient.get('/chatbot/analytics');
      
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return {
        success: false,
        error: this.handleApiError(error),
      };
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.apiClient.get('/chatbot/health');
      
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      console.error('Error checking health:', error);
      return {
        success: false,
        error: this.handleApiError(error),
      };
    }
  }

  // Test Ollama connection
  async testOllama() {
    try {
      const response = await this.apiClient.get('/chatbot/test-ollama');
      
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      console.error('Error testing Ollama:', error);
      return {
        success: false,
        error: this.handleApiError(error),
      };
    }
  }

  // Test weather service
  async testWeather(location = 'Ho Chi Minh City') {
    try {
      const response = await this.apiClient.get('/chatbot/test-weather', {
        params: { location }
      });
      
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      console.error('Error testing weather:', error);
      return {
        success: false,
        error: this.handleApiError(error),
      };
    }
  }

  async getConversationHistory(userId, limit = 50) {
    try {
      const response = await this.apiClient.get(`/chatbot/history/${userId}`, {
        params: { limit },
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return {
        success: false,
        error: this.handleApiError(error),
      };
    }
  }

  async saveConversation(userId, messages) {
    try {
      const response = await this.apiClient.post(`/chatbot/save/${userId}`, {
        messages,
        timestamp: new Date().toISOString(),
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error saving conversation:', error);
      return {
        success: false,
        error: this.handleApiError(error),
      };
    }
  }





  async clearConversationHistory(userId) {
    try {
      const response = await this.apiClient.delete(`/chatbot/history/${userId}`);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error clearing conversation history:', error);
      return {
        success: false,
        error: this.handleApiError(error),
      };
    }
  }

  // Text-to-Speech functionality (DEPRECATED - Using expo-speech directly in components)
  // async textToSpeech(text, voice = 'vi-VN-HoaiMyNeural') {
  //   await this.initialize();
  //   
  //   try {
  //     const response = await this.apiClient.post('/chatbot/tts', {
  //       text: text,
  //       voice: voice
  //     });

  //     if (response.data && response.data.success) {
  //       // Fix double /api/ issue by removing /api from audioUrl since baseURL already includes it
  //       const audioUrl = response.data.audioUrl.replace('/api/', '/');
  //       const baseUrlWithoutApi = this.apiClient.defaults.baseURL.replace('/api', '');
  //       
  //       return {
  //         success: true,
  //         data: {
  //           audioUrl: response.data.audioUrl,
  //           fullUrl: `${baseUrlWithoutApi}${response.data.audioUrl}`,
  //           voice: response.data.voice,
  //           duration: response.data.duration,
  //           size: response.data.size
  //         }
  //       };
  //     } else {
  //       throw new Error(response.data?.error || 'TTS generation failed');
  //     }
  //   } catch (error) {
  //     console.error('TTS API error:', error);
  //     return {
  //       success: false,
  //       error: this.handleApiError(error)
  //     };
  //   }
  // }

  // Get available TTS voices (DEPRECATED - Using expo-speech directly)
  // async getVoices() {
  //   await this.initialize();
  //   
  //   try {
  //     const response = await this.apiClient.get('/chatbot/voices');
  //     
  //     if (response.data && response.data.success) {
  //       return {
  //         success: true,
  //         data: response.data.voices
  //       };
  //     } else {
  //       throw new Error(response.data?.error || 'Failed to get voices');
  //     }
  //   } catch (error) {
  //     console.error('Get voices API error:', error);
  //     return {
  //       success: false,
  //       error: this.handleApiError(error)
  //     };
  //   }
  // }

  // Helper method to check if message is a device control command
  isDeviceControlCommand(lowerMessage) {
    // Vietnamese device control keywords
    const vietnameseKeywords = [
      'bật', 'tắt', 'mở', 'đóng', 'điều khiển', 'chỉnh',
      'tăng', 'giảm', 'đặt', 'cài đặt'
    ];
    
    // English device control keywords
    const englishKeywords = [
      'turn on', 'turn off', 'switch on', 'switch off',
      'open', 'close', 'control', 'set', 'adjust'
    ];
    
    // Device types in Vietnamese and English
    const deviceTypes = [
      'đèn', 'light', 'lights', 'quạt', 'fan', 'điều hòa', 'ac', 'air conditioner',
      'rèm', 'curtain', 'camera', 'máy ảnh', 'cửa', 'door', 'cửa sổ', 'window',
      'máy lạnh', 'cooler', 'máy nóng', 'heater', 'tivi', 'tv', 'television'
    ];

    // Check for device control patterns
    const hasActionKeyword = vietnameseKeywords.some(keyword => lowerMessage.includes(keyword)) ||
                             englishKeywords.some(keyword => lowerMessage.includes(keyword));
    
    const hasDeviceType = deviceTypes.some(device => lowerMessage.includes(device));
    
    return hasActionKeyword && hasDeviceType;
  }

  // Helper method to parse device control commands
  parseDeviceControl(lowerMessage, devices) {
    if (!devices || devices.length === 0) {
      return null;
    }

    // Find the device based on name, room, or type
    let targetDevice = null;
    let deviceName = '';
    
    // Try to match device by name or room mentioned in message
    for (const device of devices) {
      const deviceNameLower = device.name.toLowerCase();
      const deviceRoomLower = device.room?.toLowerCase() || '';
      
      if (lowerMessage.includes(deviceNameLower) || 
          lowerMessage.includes(deviceRoomLower) ||
          this.matchDeviceType(lowerMessage, device.widgetType || device.type)) {
        targetDevice = device;
        deviceName = device.name;
        break;
      }
    }

    // If no specific device found, try to find by type
    if (!targetDevice) {
      for (const device of devices) {
        if (this.matchDeviceByKeywords(lowerMessage, device)) {
          targetDevice = device;
          deviceName = device.name;
          break;
        }
      }
    }

    if (!targetDevice) {
      return null;
    }

    // Determine action and value
    const { action, command, value } = this.parseActionAndValue(lowerMessage, targetDevice);
    
    if (!action) {
      return null;
    }

    // Generate response
    const actionText = this.getActionText(action, value);
    const response = `Tôi đã ${actionText} ${deviceName} cho anh/chị. Anh/chị cần tôi hỗ trợ gì thêm không?`;

    return {
      deviceId: targetDevice._id,
      deviceName: deviceName,
      action: action,
      command: command,
      value: value,
      response: response
    };
  }

  // Helper method to match device type
  matchDeviceType(lowerMessage, widgetType) {
    const typeMap = {
      'switch': ['đèn', 'light', 'lights', 'công tắc'],
      'slider': ['quạt', 'fan', 'điều hòa', 'ac', 'máy lạnh'],
      'button': ['nút', 'button', 'công tắc'],
      'colorPicker': ['đèn màu', 'color light', 'rgb'],
      'sensor': ['cảm biến', 'sensor', 'nhiệt độ', 'độ ẩm']
    };

    const keywords = typeMap[widgetType] || [];
    return keywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Helper method to match device by various keywords
  matchDeviceByKeywords(lowerMessage, device) {
    // Check widget/device type keywords
    const deviceKeywords = {
      'switch': ['đèn', 'light', 'công tắc'],
      'slider': ['quạt', 'fan', 'điều hòa', 'ac'],
      'button': ['nút', 'button'],
      'colorPicker': ['màu', 'color'],
      'sensor': ['cảm biến', 'sensor']
    };

    const type = device.widgetType || device.type || 'switch';
    const keywords = deviceKeywords[type] || [];
    
    return keywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Helper method to parse action and value from message
  parseActionAndValue(lowerMessage, device) {
    let action = '';
    let command = '';
    let value = null;

    const deviceType = device.widgetType || device.type || 'switch';

    // For switch devices
    if (deviceType === 'switch' || deviceType === 'button') {
      if (lowerMessage.includes('bật') || lowerMessage.includes('turn on') || 
          lowerMessage.includes('mở') || lowerMessage.includes('on')) {
        action = 'turn_on';
        command = 'ON';
        value = 1;
      } else if (lowerMessage.includes('tắt') || lowerMessage.includes('turn off') || 
                 lowerMessage.includes('đóng') || lowerMessage.includes('off')) {
        action = 'turn_off';
        command = 'OFF';
        value = 0;
      }
    }
    
    // For slider devices (fan, AC, etc.)
    else if (deviceType === 'slider') {
      // Check for specific values
      const numberMatch = lowerMessage.match(/(\d+)/);
      if (numberMatch) {
        value = parseInt(numberMatch[1]);
        action = 'set_value';
        command = 'SET';
      }
      // Check for increase/decrease
      else if (lowerMessage.includes('tăng') || lowerMessage.includes('increase') || 
               lowerMessage.includes('lên')) {
        action = 'increase';
        command = 'INCREASE';
        value = Math.min((device.currentState?.value || 0) + 10, 100);
      } else if (lowerMessage.includes('giảm') || lowerMessage.includes('decrease') || 
                 lowerMessage.includes('xuống')) {
        action = 'decrease';
        command = 'DECREASE';
        value = Math.max((device.currentState?.value || 0) - 10, 0);
      }
      // Default on/off for sliders
      else if (lowerMessage.includes('bật') || lowerMessage.includes('turn on')) {
        action = 'turn_on';
        command = 'ON';
        value = 50; // Default middle value
      } else if (lowerMessage.includes('tắt') || lowerMessage.includes('turn off')) {
        action = 'turn_off';
        command = 'OFF';
        value = 0;
      }
    }

    return { action, command, value };
  }

  // Helper method to get action text for response
  getActionText(action, value) {
    switch (action) {
      case 'turn_on':
        return 'bật';
      case 'turn_off':
        return 'tắt';
      case 'set_value':
        return `đặt giá trị ${value}`;
      case 'increase':
        return `tăng lên ${value}`;
      case 'decrease':
        return `giảm xuống ${value}`;
      default:
        return 'điều khiển';
    }
  }

  // Helper method to get time-based greeting
  getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Chào buổi sáng';
    } else if (hour < 18) {
      return 'Chào buổi chiều';
    } else {
      return 'Chào buổi tối';
    }
  }
}

// Export singleton instance
export default new ChatBotAPI();
