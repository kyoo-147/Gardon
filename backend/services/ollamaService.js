const axios = require('axios');
const promptService = require('./promptService');

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'qwen3:0.6b';
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT) || 30000; // Reduced to 30 seconds
    
    console.log('🤖 OllamaService initialized:');
    console.log('  Base URL:', this.baseURL);
    console.log('  Model:', this.model);
    console.log('  Timeout:', this.timeout);
  }

  // Test connection to Ollama
  async testConnection() {
    try {
      // Test root endpoint first (should return "Ollama is running")
      const response = await axios.get(`${this.baseURL}/`, {
        timeout: 5000
      });
      
      console.log('🏥 Ollama health check response:', response.data);
      
      // If root endpoint works, try to get model list
      try {
        const modelsResponse = await axios.get(`${this.baseURL}/api/tags`, {
          timeout: 5000
        });
        return { 
          success: true, 
          models: modelsResponse.data.models,
          status: response.data 
        };
      } catch (modelsError) {
        console.warn('⚠️ Could not fetch models, but Ollama is running:', modelsError.message);
        return { 
          success: true, 
          models: [],
          status: response.data 
        };
      }
    } catch (error) {
      console.error('❌ Ollama connection test failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Intent classification - Enhanced based on brain_tts.py
  classifyIntent(userInput) {
    const lowerInput = userInput.toLowerCase();
    
    console.log('🔍 DEBUG: Classifying intent for:', lowerInput);
    
    // Device control keywords - Enhanced with Vietnamese and English
    const deviceControlKeywords = [
      'bật', 'tắt', 'mở', 'đóng', 'điều khiển', 'chỉnh', 'thay đổi',
      'turn on', 'turn off', 'control', 'open', 'close', 'set', 'switch'
    ];
    
    // Device listing/status keywords - IMPORTANT!
    const deviceListingKeywords = [
      'thiết bị', 'device', 'devices', 'danh sách thiết bị', 'list device',
      'có những thiết bị nào', 'thiết bị nào', 'show devices', 'my devices',
      'liệt kê thiết bị', 'xem thiết bị', 'kiểm tra thiết bị', 'hiển thị thiết bị'
    ];
    
    // Device items - Enhanced with more variations
    const deviceItems = [
      'đèn', 'light', 'light one', 'light two', 'white light', 'yellow light',
      'quạt', 'fan', 'điều hòa', 'air conditioner', 'rèm', 'curtain',
      'lights', 'both lights', 'cả hai đèn', 'tất cả đèn', 'ddd', 'switch',
      'sensor', 'cảm biến', 'camera', 'speaker', 'loa', 'tv', 'tivi'
    ];
    
    // Room keywords - Comprehensive list
    const roomKeywords = [
      'phòng khách', 'living room', 'phòng ngủ', 'bedroom', 'nhà bếp', 'kitchen',
      'phòng tắm', 'bathroom', 'văn phòng', 'office', 'garage', 'nhà để xe',
      'sân vườn', 'garden', 'ban công', 'balcony', 'hành lang', 'hallway'
    ];
    
    // Device status keywords
    const deviceStatusKeywords = [
      'trạng thái', 'status', 'tình trạng', 'check status', 'kiểm tra',
      'how is', 'thế nào', 'ra sao', 'hoạt động', 'làm việc'
    ];
    
    // Weather keywords - Enhanced 
    const weatherKeywords = [
      'thời tiết', 'weather', 'nhiệt độ', 'temperature', 
      'mưa', 'nắng', 'rain', 'sunny', 'nóng', 'lạnh',
      'độ ẩm', 'humidity', 'gió', 'wind', 'dự báo'
    ];
    
    // Status keywords
    const statusKeywords = ['báo cáo', 'report', 'tình hình', 'overview', 'tổng quan'];

    // ENHANCED DEVICE CONTROL DETECTION - Priority order matters!
    
    // 1. Check for device listing requests (highest priority)
    if (deviceListingKeywords.some(keyword => lowerInput.includes(keyword))) {
      console.log('🎯 Detected: Device listing request -', lowerInput);
      return 'device_control';
    }
    
    // 2. Check for room-based device queries - YOUR SPECIFIC CASE!
    const hasRoomKeyword = roomKeywords.some(room => lowerInput.includes(room));
    const hasDeviceKeyword = lowerInput.includes('thiết bị') || lowerInput.includes('device');
    
    console.log('🔍 DEBUG Room check:', { hasRoomKeyword, hasDeviceKeyword, lowerInput });
    
    if (hasRoomKeyword && hasDeviceKeyword) {
      console.log('🎯 Detected: Room-based device query -', lowerInput);
      return 'device_control';
    }
    
    // 3. Check for location-based queries like "ở phòng khách"
    if (lowerInput.includes('ở ') && hasRoomKeyword) {
      console.log('🎯 Detected: Location-based device query -', lowerInput);
      return 'device_control';
    }
    
    // 4. Check for device status requests
    if (deviceStatusKeywords.some(keyword => lowerInput.includes(keyword)) && 
        deviceItems.some(item => lowerInput.includes(item))) {
      console.log('🎯 Detected: Device status request -', lowerInput);
      return 'device_control';
    }
    
    // 5. Check for direct device control commands
    if (deviceControlKeywords.some(keyword => lowerInput.includes(keyword)) && 
        deviceItems.some(item => lowerInput.includes(item))) {
      console.log('🎯 Detected: Direct device control -', lowerInput);
      return 'device_control';
    }
    
    // 6. Check for device items mentioned alone (likely device query)
    if (deviceItems.some(item => lowerInput.includes(item))) {
      console.log('🎯 Detected: Device item mentioned -', lowerInput);
      return 'device_control';
    }

    // Enhanced weather detection
    if (weatherKeywords.some(keyword => lowerInput.includes(keyword))) {
      console.log('🎯 Detected: Weather query -', lowerInput);
      return 'weather';
    }

    // Check status report intent
    if (statusKeywords.some(keyword => lowerInput.includes(keyword))) {
      console.log('🎯 Detected: Status report -', lowerInput);
      return 'status_report';
    }

    // Default to general chat
    console.log('🎯 Detected: General chat -', lowerInput);
    return 'general_chat';
  }

  // Enhanced device control logic - based on brain_tts.py
  async handleDeviceControl(userInput) {
    console.log('🔌 Processing device control:', userInput);
    
    // Device mapping similar to brain_tts.py
    const lightActions = {
      "light1": ["light one", "white light", "đèn trắng", "đèn một"],
      "light2": ["light two", "yellow light", "đèn vàng", "đèn hai"], 
      "light1andlight2": ["light one and light two", "white light and yellow light", "both", "lights", "both lights", "cả hai đèn", "tất cả đèn", "hai đèn"]
    };
    
    const actionKeywords = {
      "turn on": "on",
      "turn off": "off",
      "bật": "on",
      "tắt": "off",
      "mở": "on",
      "đóng": "off"
    };

    // Check for device control commands
    for (const [lightId, keywords] of Object.entries(lightActions)) {
      for (const keyword of keywords) {
        for (const [action, apiAction] of Object.entries(actionKeywords)) {
          if (userInput.toLowerCase().includes(action) && userInput.toLowerCase().includes(keyword)) {
            console.log(`🎯 Device control detected: ${lightId} -> ${apiAction}`);
            
            // Simulate device control (you can integrate with MQTT here)
            const result = await this.controlDevice(lightId, apiAction);
            return {
              success: true,
              response: result,
              intent: 'device_control',
              deviceId: lightId,
              action: apiAction
            };
          }
        }
      }
    }

    return null; // No device control detected
  }

  // Simulate device control - integrate with MQTT service later
  async controlDevice(deviceId, action) {
    // This can be enhanced to integrate with MQTT service
    const deviceNames = {
      'light1': 'đèn trắng (Light 1)',
      'light2': 'đèn vàng (Light 2)', 
      'light1andlight2': 'cả hai đèn'
    };
    
    const actionText = action === 'on' ? 'bật' : 'tắt';
    const deviceName = deviceNames[deviceId] || deviceId;
    
    console.log(`🔧 Controlling device: ${deviceName} -> ${action}`);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return `Tôi đã ${actionText} ${deviceName} cho anh/chị. Anh/chị cần tôi hỗ trợ gì thêm không?`;
  }

  // Create messages array for Ollama
  createMessages(userInput, intent, context = {}) {
    promptService.updateTimestamp(); // Update current time
    
    const systemMessage = promptService.createSystemMessage(intent, context);
    const userMessage = {
      role: 'user',
      content: userInput
    };

    return [systemMessage, userMessage];
  }

  // Stream chat with Ollama
  async streamChat(messages, onChunk, onComplete, onError) {
    try {
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        model: this.model,
        messages: messages,
        stream: true,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40
        }
      }, {
        timeout: this.timeout,
        responseType: 'stream'
      });

      let fullResponse = '';
      let buffer = ''; // Buffer for incomplete JSON

      response.data.on('data', (chunk) => {
        try {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          
          // Keep the last potentially incomplete line in buffer
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const data = JSON.parse(line);
              
              if (data.message && data.message.content) {
                const content = data.message.content;
                fullResponse += content;
                
                // Call chunk handler
                if (onChunk) {
                  onChunk(content);
                }
              }

              // Check if streaming is complete
              if (data.done) {
                if (onComplete) {
                  onComplete(fullResponse);
                }
                return;
              }
            } catch (parseError) {
              // Silently skip malformed JSON lines - this is normal in streaming
              continue;
            }
          }
        } catch (error) {
          console.error('Error processing Ollama chunk:', error);
        }
      });

      response.data.on('error', (error) => {
        console.error('Ollama stream error:', error);
        if (onError) {
          onError(error);
        }
      });

      response.data.on('end', () => {
        if (onComplete && fullResponse) {
          onComplete(fullResponse);
        }
      });

    } catch (error) {
      console.error('Ollama request error:', error.message);
      if (onError) {
        onError(error);
      }
    }
  }

  // Non-streaming chat (fallback)
  async chat(messages) {
    try {
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        model: this.model,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40
        }
      }, {
        timeout: this.timeout
      });

      return {
        success: true,
        response: response.data.message.content
      };
    } catch (error) {
      console.error('Ollama chat error:', error.message);
      return {
        success: false,
        error: error.message,
        response: 'Xin lỗi anh/chị, hiện tại tôi đang gặp trục trặc. Vui lòng thử lại sau.'
      };
    }
  }

  // Generate response based on intent
  async generateResponse(userInput, context = {}) {
    console.log('🔄 Generating response for:', userInput);
    
    // First check for device control like brain_tts.py
    const deviceResult = await this.handleDeviceControl(userInput);
    if (deviceResult) {
      console.log('✅ Device control completed:', deviceResult);
      return {
        success: true,
        response: deviceResult.response,
        intent: deviceResult.intent,
        type: deviceResult.intent,
        deviceId: deviceResult.deviceId,
        action: deviceResult.action,
        responseTime: 500
      };
    }

    // Check for weather intent
    const intent = this.classifyIntent(userInput);
    console.log('🎯 Classified intent:', intent);
    
    if (intent === 'weather') {
      // Handle weather request similar to brain_tts.py
      const weatherService = require('./weatherService');
      try {
        const weatherData = await weatherService.getWeather('Ho Chi Minh City');
        if (weatherData && weatherData.success) {
          const weatherResponse = await this.generateWeatherResponse(weatherData.data, userInput);
          return {
            success: true,
            response: weatherResponse,
            intent: 'weather',
            type: 'weather',
            responseTime: 2000
          };
        }
      } catch (error) {
        console.error('Weather service error:', error);
      }
    }
    
    // Default to AI chat like brain_tts.py
    const messages = this.createMessages(userInput, intent, context);
    console.log('📝 Created messages:', JSON.stringify(messages, null, 2));

    return new Promise((resolve, reject) => {
      let fullResponse = '';
      const startTime = Date.now();

      console.log('🚀 Starting Ollama stream chat...');
      
      this.streamChat(
        messages,
        (chunk) => {
          // Chunk handler - can be used for real-time updates
          fullResponse += chunk;
          console.log('📦 Received chunk:', chunk.substring(0, 50) + '...');
        },
        (complete) => {
          // Complete handler
          const responseTime = Date.now() - startTime;
          console.log('✅ Chat completed in', responseTime, 'ms');
          console.log('📄 Full response length:', (complete || fullResponse).length);
          
          resolve({
            success: true,
            response: complete || fullResponse,
            intent: intent,
            type: intent,
            model: this.model,
            responseTime: responseTime
          });
        },
        (error) => {
          // Error handler
          const responseTime = Date.now() - startTime;
          console.error('❌ Chat error after', responseTime, 'ms:', error.message);
          
          reject({
            success: false,
            error: error.message,
            response: 'Xin lỗi anh/chị, hiện tại tôi đang gặp trục trặc. Vui lòng thử lại sau.',
            intent: intent,
            type: intent,
            responseTime: responseTime
          });
        }
      );
    });
  }

  // Generate weather response similar to brain_tts.py
  async generateWeatherResponse(weatherData, userInput) {
    try {
      const weatherPrompt = `Bạn là chuyên gia dự báo thời tiết chuyên nghiệp. Hãy cung cấp thông tin thời tiết ngắn gọn và chính xác.
Dữ liệu thời tiết:
${JSON.stringify(weatherData, null, 2)}

Hãy tóm tắt tình hình thời tiết hiện tại và dự báo một cách dễ hiểu cho người dùng về: ${userInput}`;

      const messages = [
        { role: 'system', content: weatherPrompt },
        { role: 'user', content: userInput }
      ];

      const result = await this.chat(messages);
      return result.response || 'Xin lỗi, tôi không thể lấy thông tin thời tiết lúc này.';
    } catch (error) {
      console.error('Weather generation error:', error);
      return 'Xin lỗi, tôi không thể lấy thông tin thời tiết lúc này.';
    }
  }
}

module.exports = new OllamaService();
