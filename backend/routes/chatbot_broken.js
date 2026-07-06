const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const ollamaService = require('../services/ollamaService');
const loggingService = require('../services/loggingService');
const ttsService = require('../services/ttsService');
const Device = require('../models/Device');
const mqttService = require('../services/mqttService');
const path = require('path');

// Special authentication middleware for NAVIN-AGENT-AI
// Accepts both JWT tokens and ACCESS_TOKEN for testing
function authenticateNavinAgent(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Check if it's the special ACCESS_TOKEN
  if (token === process.env.ACCESS_TOKEN) {
    req.userId = 'navin_agent_user';
    req.username = 'navin_agent';
    return next();
  }

  // Otherwise verify as JWT token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  });
}

// Simple test endpoint without authentication
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'NAVIN-AGENT-AI Backend is working!',
    timestamp: new Date().toISOString(),
    ollama_url: process.env.OLLAMA_BASE_URL,
    model: process.env.OLLAMA_MODEL
  });
});

// NAVIN-AGENT-AI: Enhanced chat endpoint with IoT device control
router.post('/chat', authenticateNavinAgent, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { content, message, userId, context } = req.body;
    const userInput = content || message; // Support both field names
    const actualUserId = userId || req.userId || 'anonymous';
    
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Content or message is required and must be a string'
      });
    }

    // Log user message
    await loggingService.logUserMessage(actualUserId, userInput, 'chat', {
      endpoint: '/api/chatbot/chat',
      requestTime: new Date().toISOString()
    });

    // Check if this is a device control command in Vietnamese/English
    const deviceControl = await processDeviceControlCommand(userInput, actualUserId);
    
    if (deviceControl.isDeviceControl) {
      const responseTime = Date.now() - startTime;
      
      // Log device control action
      await loggingService.logAIResponse(actualUserId, deviceControl.response, 'device_control', {
        responseTime: responseTime,
        action: deviceControl.action,
        deviceId: deviceControl.deviceId,
        success: deviceControl.success,
        endpoint: '/api/chatbot/chat'
      });

      return res.json({
        success: true,
        data: {
          response: deviceControl.response,
          intent: 'device_control',
          type: 'device_control',
          timestamp: new Date().toISOString(),
          responseTime: responseTime,
          deviceControl: {
            success: deviceControl.success,
            deviceId: deviceControl.deviceId,
            deviceName: deviceControl.deviceName,
            action: deviceControl.action,
            value: deviceControl.value
          }
        }
      });
    }

    // If not device control, proceed with normal chat
    const result = await ollamaService.generateResponse(userInput, context || {});
    
    const responseTime = Date.now() - startTime;
    
    // Log AI response
    await loggingService.logAIResponse(actualUserId, result.response, result.intent, {
      responseTime: responseTime,
      model: result.model || 'qwen3:0.6b',
      endpoint: '/api/chatbot/chat'
    });

    // Return standardized format
    res.json({
      success: true,
      data: {
        response: result.response,
        intent: result.intent || result.type,
        type: result.type || result.intent,
        timestamp: new Date().toISOString(),
        responseTime: responseTime,
        ...(result.deviceId && { deviceId: result.deviceId }),
        ...(result.action && { action: result.action })
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Chat endpoint error:', error);
    
    // Log error
    await loggingService.logError('chat_endpoint', error.message, {
      userId: req.userId,
      endpoint: '/api/chatbot/chat',
      responseTime: responseTime
    });

    res.status(500).json({
      success: false,
      error: 'Xin lỗi, hiện tại tôi đang gặp trục trặc. Vui lòng thử lại sau.',
      responseTime: responseTime
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Chatbot service is healthy',
    timestamp: new Date().toISOString()
  });
});

// Generate JWT token for testing
router.post('/generate-token', (req, res) => {
  try {
    const { userId = 'test_user', username = 'test' } = req.body;
    
    const token = jwt.sign(
      { userId, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: token,
      userId: userId,
      username: username,
      expiresIn: '7 days'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate token'
    });
  }
});
});

// Test Ollama endpoint
router.get('/test-ollama', authenticateNavinAgent, async (req, res) => {
  try {
    const result = await ollamaService.testConnection();
    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test weather endpoint
router.get('/test-weather', authenticateNavinAgent, async (req, res) => {
  try {
    const location = req.query.location || 'Ho Chi Minh City';
    const weatherService = require('../services/weatherService');
    const result = await weatherService.getProcessedWeather(location);
    
    res.json({
      success: result.success,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TTS endpoint - Convert text to speech
router.post('/tts', authenticateNavinAgent, async (req, res) => {
  try {
    const { text, voice } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    // Generate speech
    const result = await ttsService.textToSpeech(text, voice);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    // Log TTS usage
    await loggingService.log('tts_request', {
      userId: req.userId,
      username: req.username,
      text_length: text.length,
      voice: result.voice,
      file_size: result.size,
      duration: result.duration
    });

    res.json({
      success: true,
      audioUrl: `/api/chatbot/audio/${result.filename}`,
      voice: result.voice,
      duration: result.duration,
      size: result.size
    });

  } catch (error) {
    console.error('TTS Error:', error);
    await loggingService.log('tts_error', {
      userId: req.userId,
      username: req.username,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Audio file serving endpoint
router.get('/audio/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../temp/audio', filename);
    
    // Security check - chỉ cho phép file .mp3
    if (!filename.endsWith('.mp3') || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Set headers cho audio
    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600', // Cache 1 giờ
      'Accept-Ranges': 'bytes'
    });

    // Stream file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving audio file:', err);
        if (!res.headersSent) {
          res.status(404).json({ error: 'Audio file not found' });
        }
      } else {
        // Cleanup file sau 5 phút
        setTimeout(() => {
          ttsService.cleanupFile(filePath);
        }, 5 * 60 * 1000);
      }
    });

  } catch (error) {
    console.error('Audio serving error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available voices
router.get('/voices', authenticateNavinAgent, (req, res) => {
  try {
    const voices = ttsService.getAvailableVoices();
    res.json({
      success: true,
      voices
    });
  } catch (error) {
    console.error('Get voices error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to process Vietnamese device control commands
async function processDeviceControlCommand(input, userId) {
  const lowerInput = input.toLowerCase();
  
  // Vietnamese and English device control keywords
  const controlKeywords = [
    'bật', 'tắt', 'mở', 'đóng', 'điều chỉnh', 'đặt', 'chỉnh',
    'turn on', 'turn off', 'open', 'close', 'set', 'adjust'
  ];
  
  const deviceKeywords = [
    'đèn', 'quạt', 'điều hòa', 'máy lạnh', 'cửa', 'garage', 'bóng đèn',
    'light', 'fan', 'air conditioner', 'ac', 'door', 'bulb', 'switch'
  ];
  
  // Check if input contains control keywords
  const hasControlKeyword = controlKeywords.some(keyword => lowerInput.includes(keyword));
  const hasDeviceKeyword = deviceKeywords.some(keyword => lowerInput.includes(keyword));
  
  if (!hasControlKeyword && !hasDeviceKeyword) {
    return { isDeviceControl: false };
  }
  
  try {
    // Get all user devices from database
    const devices = await Device.find({ userId }).populate('mqttConfigId');
    
    if (!devices || devices.length === 0) {
      return {
        isDeviceControl: true,
        success: false,
        response: 'Tôi không tìm thấy thiết bị nào trong hệ thống của bạn. Vui lòng thêm thiết bị trước.',
        deviceId: null
      };
    }
    
    // Parse device control command
    const parsedCommand = parseVietnameseDeviceCommand(lowerInput, devices);
    
    if (!parsedCommand.device) {
      return {
        isDeviceControl: true,
        success: false,
        response: `Tôi không tìm thấy thiết bị "${parsedCommand.searchTerm || 'đã yêu cầu'}". Các thiết bị có sẵn: ${devices.map(d => d.name).join(', ')}.`,
        deviceId: null
      };
    }
    
    // Execute device control
    const controlResult = await executeDeviceControl(parsedCommand.device, parsedCommand.action, parsedCommand.value);
    
    if (controlResult.success) {
      return {
        isDeviceControl: true,
        success: true,
        response: `Đã ${parsedCommand.actionText} ${parsedCommand.device.name} thành công.`,
        deviceId: parsedCommand.device._id,
        deviceName: parsedCommand.device.name,
        action: parsedCommand.action,
        value: parsedCommand.value
      };
    } else {
      return {
        isDeviceControl: true,
        success: false,
        response: `Không thể điều khiển ${parsedCommand.device.name}. Lỗi: ${controlResult.error}`,
        deviceId: parsedCommand.device._id,
        deviceName: parsedCommand.device.name
      };
    }
    
  } catch (error) {
    console.error('Device control error:', error);
    return {
      isDeviceControl: true,
      success: false,
      response: 'Xin lỗi, tôi gặp lỗi khi điều khiển thiết bị. Vui lòng thử lại.',
      deviceId: null
    };
  }
}

// Parse Vietnamese device commands
function parseVietnameseDeviceCommand(input, devices) {
  // Device action mapping
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
  
  // Find action
  let detectedAction = null;
  for (const [keyword, actionInfo] of Object.entries(actionMapping)) {
    if (input.includes(keyword)) {
      detectedAction = actionInfo;
      break;
    }
  }
  
  if (!detectedAction) {
    detectedAction = { action: 'ON', actionText: 'bật' }; // Default action
  }
  
  // Find device by name, room, or type
  let matchedDevice = null;
  let searchTerm = '';
  
  // Try exact name match first
  for (const device of devices) {
    if (input.includes(device.name.toLowerCase())) {
      matchedDevice = device;
      searchTerm = device.name;
      break;
    }
    
    // Try room match
    if (device.room && input.includes(device.room.toLowerCase())) {
      matchedDevice = device;
      searchTerm = device.room;
      break;
    }
  }
  
  // If no exact match, try device type keywords
  if (!matchedDevice) {
    const deviceTypeMapping = {
      'đèn': ['switch', 'button', 'light'],
      'quạt': ['fan', 'switch', 'button'],
      'điều hòa': ['ac', 'air conditioner', 'switch'],
      'máy lạnh': ['ac', 'air conditioner', 'switch'],
      'cửa': ['door', 'garage', 'switch'],
      'light': ['switch', 'button'],
      'fan': ['switch', 'button'],
      'door': ['switch', 'button']
    };
    
    for (const [keyword, types] of Object.entries(deviceTypeMapping)) {
      if (input.includes(keyword)) {
        // Find device of matching type
        matchedDevice = devices.find(device => 
          types.includes(device.widgetType) || 
          device.name.toLowerCase().includes(keyword) ||
          device.description?.toLowerCase().includes(keyword)
        );
        searchTerm = keyword;
        break;
      }
    }
  }
  
  // Parse value for sliders, etc.
  let value = detectedAction.action;
  const numberMatch = input.match(/(\d+)/);
  if (numberMatch && matchedDevice?.widgetType === 'slider') {
    value = parseInt(numberMatch[1]);
  }
  
  return {
    device: matchedDevice,
    action: detectedAction.action,
    actionText: detectedAction.actionText,
    value: value,
    searchTerm: searchTerm
  };
}

// Execute device control using the existing API logic
async function executeDeviceControl(device, action, value) {
  try {
    // Check if there's already a pending command
    const syncStatus = device.getSyncStatus();
    if (syncStatus.pendingCommand && syncStatus.pendingCommand.status === 'pending') {
      const timeRemaining = syncStatus.pendingCommand.timeoutAt - new Date();
      
      if (timeRemaining > 0) {
        return {
          success: false,
          error: 'Thiết bị đang xử lý lệnh khác, vui lòng thử lại sau.'
        };
      }
    }

    // Prepare message based on device payload type
    let message;
    let commandValue = value;
    
    // Handle different widget types
    switch (device.widgetType) {
      case 'switch':
        commandValue = action === 'ON' ? 'ON' : 'OFF';
        break;
      case 'button':
        commandValue = action;
        break;
      case 'slider':
        commandValue = Number(value);
        break;
      case 'colorPicker':
        commandValue = value;
        break;
      default:
        commandValue = value !== undefined ? value : action;
    }

    if (device.mqtt.payloadType === 'json') {
      message = JSON.stringify({ 
        command: action, 
        value: commandValue, 
        timestamp: new Date().toISOString(),
        deviceId: device._id 
      });
    } else {
      message = commandValue.toString();
    }

    console.log('📤 ChatBot Device Control:', {
      deviceName: device.name,
      topic: device.mqtt.publishTopic,
      message,
      action,
      value: commandValue
    });

    // Set desired state and pending command
    device.setDesiredState(action, commandValue, 30000);

    const success = mqttService.publishMessage(
      device.userId.toString(),
      device.mqtt.publishTopic,
      message,
      {
        qos: device.mqtt.qos,
        retain: device.mqtt.retain
      }
    );

    if (success) {
      // Update state immediately
      device.currentState.value = commandValue;
      device.currentState.reportedState = commandValue;
      device.currentState.synchronized = true;
      device.currentState.lastUpdated = new Date();
      device.currentState.online = true;
      device.currentState.pendingCommand = undefined;
      
      device.addStateHistory(commandValue, 'confirmed', action);
      await device.save();

      return {
        success: true,
        message: 'Lệnh được thực hiện thành công',
        value: commandValue
      };
    } else {
      return {
        success: false,
        error: 'Không thể kết nối đến thiết bị'
      };
    }
  } catch (error) {
    console.error('Execute device control error:', error);
    return {
      success: false,
      error: error.message || 'Lỗi không xác định'
    };
  }
}

module.exports = router;
