const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const ollamaService = require('../services/ollamaService');
const weatherService = require('../services/weatherService');
const loggingService = require('../services/loggingService');
const mqttService = require('../services/mqttService');

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

// NAVIN-AGENT-AI: Main chat endpoint with Ollama integration
router.post('/chat', authenticateToken, async (req, res) => {
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

    // Generate response using enhanced OllamaService
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

// Device Control Handler
      success: true,
      data: {
        response: response,
        intent: intent,
        type: responseType,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('Chat endpoint error:', error);
    
    // Log error
    await loggingService.logBotMessage(req.userId || 'anonymous', 
      'Xin lỗi anh/chị, hiện tại tôi đang gặp trục trặc. Vui lòng thử lại sau.',
      'error', {
        error: error.message,
        endpoint: '/api/chatbot/chat'
      });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      data: {
        response: 'Xin lỗi anh/chị, hiện tại tôi đang gặp trục trặc. Vui lòng thử lại sau.',
        intent: 'error',
        type: 'error'
      }
    });
  }
});

// Streaming chat endpoint (for real-time responses)
router.post('/chat/stream', authenticateToken, async (req, res) => {
  const { content, userId } = req.body;
  const actualUserId = userId || req.userId || 'anonymous';

  if (!content || typeof content !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Content is required and must be a string'
    });
  }

  // Set headers for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  try {
    // Log user message
    await loggingService.logUserMessage(actualUserId, content, 'chat', {
      endpoint: '/api/chatbot/chat/stream',
      requestTime: new Date().toISOString()
    });

    const intent = ollamaService.classifyIntent(content);
    let context = {};
    let fullResponse = '';

    // Handle weather context if needed
    if (intent === 'weather') {
      const weatherResult = await weatherService.handleWeatherRequest(content);
      if (weatherResult.success) {
        context.weatherData = weatherResult.data;
      }
    }

    // Handle status context if needed
    if (intent === 'status_report') {
      context = await getSystemStatus();
    }

    const messages = ollamaService.createMessages(content, intent, context);

    // Stream response from Ollama
    await ollamaService.streamChat(
      messages,
      (chunk) => {
        // Send chunk to client
        res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
        fullResponse += chunk;
      },
      async (complete) => {
        // Send completion signal
        res.write(`data: ${JSON.stringify({ chunk: '', done: true, complete: complete || fullResponse })}\n\n`);
        res.end();

        // Log bot response
        await loggingService.logBotMessage(actualUserId, complete || fullResponse, intent, {
          intent: intent,
          model: 'qwen3:0.6b',
          endpoint: '/api/chatbot/chat/stream'
        });
      },
      async (error) => {
        // Send error
        const errorMsg = 'Xin lỗi anh/chị, hiện tại tôi đang gặp trục trặc. Vui lòng thử lại sau.';
        res.write(`data: ${JSON.stringify({ error: errorMsg, done: true })}\n\n`);
        res.end();

        // Log error
        await loggingService.logBotMessage(actualUserId, errorMsg, 'error', {
          error: error.message,
          endpoint: '/api/chatbot/chat/stream'
        });
      }
    );

  } catch (error) {
    console.error('Stream chat error:', error);
    const errorMsg = 'Xin lỗi anh/chị, hiện tại tôi đang gặp trục trặc. Vui lòng thử lại sau.';
    res.write(`data: ${JSON.stringify({ error: errorMsg, done: true })}\n\n`);
    res.end();
  }
});

// Device control helper function
async function handleDeviceControl(content) {
  const lowerContent = content.toLowerCase();
  
  // Extract device action
  let action = 'unknown';
  let device = 'unknown';
  
  if (lowerContent.includes('bật') || lowerContent.includes('turn on')) {
    action = 'turn_on';
  } else if (lowerContent.includes('tắt') || lowerContent.includes('turn off')) {
    action = 'turn_off';
  }
  
  // Extract device type
  if (lowerContent.includes('đèn') || lowerContent.includes('light')) {
    device = 'light';
  } else if (lowerContent.includes('quạt') || lowerContent.includes('fan')) {
    device = 'fan';
  } else if (lowerContent.includes('điều hòa') || lowerContent.includes('air conditioner')) {
    device = 'ac';
  }

  // Send MQTT command (if mqttService is available)
  try {
    if (mqttService && typeof mqttService.publishMessage === 'function') {
      const topic = `home/${device}/command`;
      const payload = { action: action, timestamp: new Date().toISOString() };
      await mqttService.publishMessage(topic, JSON.stringify(payload));
    }
  } catch (error) {
    console.error('MQTT publish error:', error);
  }

  // Generate confirmation response
  const deviceNames = {
    'light': 'đèn',
    'fan': 'quạt', 
    'ac': 'điều hòa'
  };

  const actions = {
    'turn_on': 'đã được bật',
    'turn_off': 'đã được tắt'
  };

  const response = `${deviceNames[device] || device} ${actions[action] || action}. Anh/chị cần tôi làm gì nữa không?`;
  
  return {
    response: response,
    action: action,
    device: device
  };
}

// Get system status helper function
async function getSystemStatus() {
  try {
    // Mock system status - replace with actual system calls
    const status = {
      devices: {
        total: 5,
        online: 3,
        offline: 2,
        list: [
          { name: 'Đèn phòng khách', type: 'light', status: 'online' },
          { name: 'Quạt phòng ngủ', type: 'fan', status: 'online' },
          { name: 'Điều hòa', type: 'ac', status: 'offline' }
        ]
      },
      environment: {
        temperature: '27°C',
        humidity: '65%',
        airQuality: 'Good'
      },
      alerts: []
    };

    return status;
  } catch (error) {
    console.error('Error getting system status:', error);
    return {
      devices: { total: 0, online: 0, offline: 0, list: [] },
      environment: {},
      alerts: ['Không thể lấy thông tin trạng thái hệ thống']
    };
  }
}

// Conversation history endpoint
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId || 'anonymous';
    const limit = parseInt(req.query.limit) || 10;
    
    const history = await loggingService.getConversationHistory(userId, limit);
    
    res.json({
      success: true,
      data: {
        history: history,
        count: history.length
      }
    });
  } catch (error) {
    console.error('History endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation history'
    });
  }
});

// Analytics endpoint (admin only)
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const analytics = await loggingService.getDailyAnalytics();
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Analytics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const ollamaHealth = await ollamaService.testConnection();
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        services: {
          ollama: ollamaHealth.success ? 'online' : 'offline',
          logging: 'online',
          weather: 'online'
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Test Ollama connection
router.get('/test-ollama', authenticateToken, async (req, res) => {
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

// Test weather service
router.get('/test-weather', authenticateToken, async (req, res) => {
  try {
    const location = req.query.location || 'Ho Chi Minh City';
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

module.exports = router;
