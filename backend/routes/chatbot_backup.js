const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const ollamaService = require('../services/ollamaService');
const weatherService = require('../services/weatherService');
const loggingService = require('../services/loggingService');
const mqttService = require('../services/mqttService');

// NAVIN-AGENT-AI: Main chat endpoint with Ollama integration
router.post('/chat', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { content, userId } = req.body;
    const actualUserId = userId || req.userId || 'anonymous';
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Content is required and must be a string'
      });
    }

    // Log user message
    await loggingService.logUserMessage(actualUserId, content, 'chat', {
      endpoint: '/api/chatbot/chat',
      requestTime: new Date().toISOString()
    });

    // Classify intent
    const intent = ollamaService.classifyIntent(content);
    let context = {};
    let response = '';
    let responseType = 'chat';

    // Handle different intents according to CONTEXT_AGENT.md
    switch (intent) {
      case 'device_control':
        // MQTT device control
        try {
          const deviceResult = await handleDeviceControl(content);
          response = deviceResult.response;
          responseType = 'device_control';
          context.deviceAction = deviceResult.action;
        } catch (error) {
          console.error('Device control error:', error);
          response = 'Xin lỗi anh/chị, tôi không thể điều khiển thiết bị này lúc này. Vui lòng kiểm tra kết nối MQTT.';
        }
        break;

      case 'weather':
        // Weather information with AI summary
        try {
          const weatherResult = await weatherService.handleWeatherRequest(content);
          if (weatherResult.success) {
            context.weatherData = weatherResult.data;
            const aiResult = await ollamaService.generateResponse(content, context);
            response = aiResult.response;
            responseType = 'weather';
          } else {
            response = 'Xin lỗi anh/chị, tôi không thể lấy thông tin thời tiết lúc này. Vui lòng thử lại sau.';
          }
        } catch (error) {
          console.error('Weather error:', error);
          response = 'Xin lỗi anh/chị, dịch vụ thời tiết đang gặp sự cố. Vui lòng thử lại sau.';
        }
        break;

      case 'status_report':
        // IoT system status report
        try {
          const statusContext = await getSystemStatus();
          context = { ...context, ...statusContext };
          const aiResult = await ollamaService.generateResponse(content, context);
          response = aiResult.response;
          responseType = 'status_report';
        } catch (error) {
          console.error('Status report error:', error);
          response = 'Xin lỗi anh/chị, tôi không thể lấy báo cáo trạng thái lúc này.';
        }
        break;

      case 'general_chat':
      default:
        // General AI chat through Ollama
        try {
          const aiResult = await ollamaService.generateResponse(content, context);
          response = aiResult.response;
          responseType = 'general_chat';
        } catch (error) {
          console.error('AI chat error:', error);
          response = 'Xin lỗi anh/chị, hiện tại tôi đang gặp trục trặc. Vui lòng thử lại sau.';
        }
        break;
    }

    // Log bot response
    await loggingService.logBotMessage(actualUserId, response, responseType, {
      intent: intent,
      model: 'qwen3:0.6b',
      responseTime: Date.now() - startTime,
      endpoint: '/api/chatbot/chat'
    });

    // Return response
    res.json({
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
  const lowerMessage = message.toLowerCase();
  let response = '';
  let type = 'text';
  let metadata = null;

  try {
    // Device-related queries
    if (lowerMessage.includes('device') || lowerMessage.includes('devices')) {
      if (context.devices && context.devices.length > 0) {
        response = `You have ${context.devices.length} device(s) connected:\n`;
        response += context.devices.map(device => 
          `• ${device.name} (${device.type}) - Status: ${device.status || 'Unknown'}`
        ).join('\n');
        
        // Check for control commands
        if (lowerMessage.includes('turn on') || lowerMessage.includes('turn off')) {
          const action = lowerMessage.includes('turn on') ? 'turn_on' : 'turn_off';
          const deviceName = extractDeviceName(lowerMessage, context.devices);
          if (deviceName) {
            response += `\n\nWould you like me to ${action.replace('_', ' ')} ${deviceName}?`;
            type = 'device_command';
            metadata = { action, deviceName };
          }
        }
      } else {
        response = "You don't have any devices connected yet. Would you like me to help you add a device?";
      }
    }
    // MQTT-related queries
    else if (lowerMessage.includes('mqtt') || lowerMessage.includes('connection')) {
      if (context.currentConnection && context.currentConnection.connected) {
        response = `🔗 MQTT Status: Connected ✅\n`;
        response += `📡 Broker: ${context.currentConnection.name}\n`;
        response += `🌐 Host: ${context.currentConnection.host}\n`;
        response += `⚡ Connection: Active and stable`;
      } else {
        response = "🔗 MQTT Status: Disconnected ❌\n\n";
        response += "You're not currently connected to any MQTT broker. Here's how I can help:\n";
        response += "• Guide you through MQTT setup\n";
        response += "• Help troubleshoot connection issues\n";
        response += "• Recommend broker configurations";
      }
    }
    // System status overview
    else if (lowerMessage.includes('status') || lowerMessage.includes('overview')) {
      response = `📊 IoT System Overview\n\n`;
      response += `🔗 MQTT: ${context.currentConnection?.connected ? '✅ Connected' : '❌ Disconnected'}\n`;
      response += `📱 Devices: ${context.deviceCount || 0} connected\n`;
      
      if (context.devices && context.devices.length > 0) {
        const activeDevices = context.devices.filter(d => 
          d.status === 'online' || d.status === 'active' || d.status === 'connected'
        ).length;
        response += `⚡ Active Devices: ${activeDevices}/${context.devices.length}\n`;
        response += `📈 System Health: ${activeDevices === context.devices.length ? 'Excellent' : 'Good'}\n`;
      }
      
      response += `\n${context.currentConnection?.connected && context.deviceCount > 0 
        ? '✨ Everything looks great!' 
        : '🔧 Some components need attention'}`;
    }
    // Help and capabilities
    else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      response = `🤖 IoT Assistant - Here to Help!\n\n`;
      response += `📱 **Device Management:**\n`;
      response += `  • Check device status and health\n`;
      response += `  • Control devices (turn on/off)\n`;
      response += `  • Add and configure new devices\n`;
      response += `  • Monitor device performance\n\n`;
      response += `🔗 **MQTT Operations:**\n`;
      response += `  • Connection status monitoring\n`;
      response += `  • Troubleshooting assistance\n`;
      response += `  • Configuration guidance\n`;
      response += `  • Broker recommendations\n\n`;
      response += `🔧 **System Monitoring:**\n`;
      response += `  • Overall system health\n`;
      response += `  • Performance insights\n`;
      response += `  • Issue diagnosis and solutions\n`;
      response += `  • Optimization suggestions\n\n`;
      response += `💬 Just ask me in natural language - I understand! 😊`;
    }
    // Troubleshooting assistance
    else if (lowerMessage.includes('problem') || lowerMessage.includes('issue') || 
             lowerMessage.includes('troubleshoot') || lowerMessage.includes('fix')) {
      response = `🔧 Troubleshooting Assistant\n\n`;
      
      const issues = [];
      const solutions = [];
      
      if (!context.currentConnection?.connected) {
        issues.push("❌ MQTT connection is down");
        solutions.push("1. Check internet connectivity");
        solutions.push("2. Verify MQTT broker settings");
        solutions.push("3. Test broker accessibility");
      }
      
      if (!context.devices || context.devices.length === 0) {
        issues.push("❌ No devices connected");
        solutions.push("4. Add devices through the Devices tab");
        solutions.push("5. Check device power and network");
      } else {
        const offlineDevices = context.devices.filter(d => 
          d.status !== 'online' && d.status !== 'active' && d.status !== 'connected'
        );
        if (offlineDevices.length > 0) {
          issues.push(`❌ ${offlineDevices.length} device(s) offline`);
          solutions.push("6. Check device power and connections");
          solutions.push("7. Verify device network settings");
        }
      }
      
      if (issues.length > 0) {
        response += `**Issues Detected:**\n${issues.join('\n')}\n\n`;
        response += `**Recommended Solutions:**\n${solutions.join('\n')}\n\n`;
        response += `💡 **Pro Tip:** Try the solutions in order, and let me know if you need specific guidance for any step!`;
      } else {
        response += `✅ **No major issues detected!**\n\n`;
        response += `Your IoT system appears to be running smoothly:\n`;
        response += `• MQTT connection is stable\n`;
        response += `• All devices are responding\n`;
        response += `• System performance is optimal\n\n`;
        response += `If you're experiencing specific issues, please describe them and I'll provide targeted assistance! 🚀`;
      }
    }
    // Performance and optimization
    else if (lowerMessage.includes('performance') || lowerMessage.includes('optimize') || 
             lowerMessage.includes('speed') || lowerMessage.includes('improve')) {
      response = `🚀 Performance Optimization Tips\n\n`;
      
      if (context.devices && context.devices.length > 0) {
        response += `**Current Setup Analysis:**\n`;
        response += `• Managing ${context.devices.length} devices\n`;
        response += `• MQTT connection: ${context.currentConnection?.connected ? 'Stable' : 'Needs attention'}\n\n`;
        
        response += `**Optimization Recommendations:**\n`;
        response += `🔹 **Network Optimization:**\n`;
        response += `  • Use quality of service (QoS) levels appropriately\n`;
        response += `  • Implement keep-alive intervals efficiently\n`;
        response += `  • Monitor message frequency and size\n\n`;
        
        response += `🔹 **Device Management:**\n`;
        response += `  • Group similar devices for bulk operations\n`;
        response += `  • Set up automated health checks\n`;
        response += `  • Use device sleep modes when appropriate\n\n`;
        
        response += `🔹 **System Health:**\n`;
        response += `  • Regular connection testing\n`;
        response += `  • Monitor system resource usage\n`;
        response += `  • Update device firmware regularly`;
      } else {
        response += `To provide optimization tips, I need some devices to analyze. Once you add devices, I can give you personalized recommendations! 📈`;
      }
    }
    // Greetings and conversational
    else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || 
             lowerMessage.includes('hey') || lowerMessage.includes('good morning') ||
             lowerMessage.includes('good afternoon') || lowerMessage.includes('good evening')) {
      const timeGreeting = getTimeBasedGreeting();
      response = `${timeGreeting}! I'm your IoT Assistant 🤖\n\n`;
      response += `**Quick System Status:**\n`;
      response += `📱 Devices: ${context.deviceCount || 0} connected\n`;
      response += `🔗 MQTT: ${context.currentConnection?.connected ? 'Connected' : 'Disconnected'}\n`;
      response += `💚 System: ${context.currentConnection?.connected && context.deviceCount > 0 ? 'Healthy' : 'Needs Setup'}\n\n`;
      response += `How can I help you manage your IoT ecosystem today? Feel free to ask about devices, connections, or any issues you're experiencing! 😊`;
    }
    // Thank you responses
    else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      response = `You're very welcome! 😊 I'm always here to help with your IoT setup.\n\n`;
      response += `Feel free to ask me anything about:\n`;
      response += `• Device management and control\n`;
      response += `• MQTT troubleshooting\n`;
      response += `• System optimization\n`;
      response += `• Performance monitoring\n\n`;
      response += `Have a great day managing your smart devices! 🚀`;
    }
    // Default response for unrecognized queries
    else {
      response = `I'd love to help you with your IoT setup! 🤖\n\n`;
      response += `**Here are some things you can ask me:**\n\n`;
      response += `💬 **Try these examples:**\n`;
      response += `• "Show me my devices"\n`;
      response += `• "What's my MQTT status?"\n`;
      response += `• "Turn on [device name]"\n`;
      response += `• "Help me troubleshoot"\n`;
      response += `• "How can I optimize performance?"\n`;
      response += `• "What's my system overview?"\n\n`;
      response += `**Current Context:**\n`;
      response += `📱 ${context.deviceCount || 0} devices available\n`;
      response += `🔗 MQTT ${context.currentConnection?.connected ? 'connected' : 'disconnected'}\n\n`;
      response += `I'm designed to make managing your IoT devices easier and more intuitive! 😊`;
    }

    return {
      response,
      type,
      metadata,
      timestamp: new Date().toISOString(),
      success: true
    };

  } catch (error) {
    console.error('Error processing message:', error);
    return {
      response: "I'm sorry, I encountered an error processing your request. Please try again or rephrase your question.",
      type: 'text',
      metadata: null,
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message
    };
  }
};

// Helper function to extract device name from message
const extractDeviceName = (message, devices) => {
  if (!devices || devices.length === 0) return null;
  
  for (const device of devices) {
    if (message.toLowerCase().includes(device.name.toLowerCase())) {
      return device.name;
    }
  }
  return null;
};

// Helper function for time-based greetings
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// POST /api/chatbot/message - Process chatbot message
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Process the message
    const result = processMessage(message, context);

    // Log the interaction (optional)
    console.log(`Chatbot interaction - User: ${req.userId}, Message: ${message.substring(0, 50)}...`);

    res.json(result);

  } catch (error) {
    console.error('Chatbot message error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process chatbot message'
    });
  }
});

// GET /api/chatbot/history - Get conversation history (future feature)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    // This would fetch conversation history from database
    // For now, return empty array
    res.json({
      success: true,
      data: [],
      message: 'Conversation history feature coming soon'
    });
  } catch (error) {
    console.error('Chatbot history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// DELETE /api/chatbot/history - Clear conversation history (future feature)
router.delete('/history', authenticateToken, async (req, res) => {
  try {
    // This would clear conversation history from database
    res.json({
      success: true,
      message: 'Conversation history cleared'
    });
  } catch (error) {
    console.error('Chatbot history clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/chatbot/feedback - Submit feedback on chatbot responses (future feature)
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { messageId, rating, feedback } = req.body;
    
    // This would save feedback to database for improving responses
    console.log(`Chatbot feedback - User: ${req.userId}, Rating: ${rating}, Feedback: ${feedback}`);
    
    res.json({
      success: true,
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    console.error('Chatbot feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
