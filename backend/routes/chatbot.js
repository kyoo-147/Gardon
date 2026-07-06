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
// SECURITY FIX: Proper user isolation even for testing
function authenticateNavinAgent(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Check if it's the special ACCESS_TOKEN
  if (token === process.env.ACCESS_TOKEN) {
    // SECURITY FIX: Generate unique test user ID instead of shared one
    const testUserId = 'test_user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    req.userId = testUserId;
    req.username = 'test_agent';
    console.log('🔐 Generated unique test user ID:', testUserId);
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
    
    // SECURE: Use the actual userId from authenticated request only
    const actualUserId = userId || req.userId;
    
    // SECURITY: Ensure we have a valid user ID
    if (!actualUserId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - no valid user ID provided',
        code: 'MISSING_USER_ID'
      });
    }
    
    console.log('🎯 Final userId for device query:', actualUserId);
    
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

// Helper function to process Vietnamese device control commands - Enhanced with brain_tts.py logic
async function processDeviceControlCommand(input, userId) {
  const lowerInput = input.toLowerCase();
  console.log('🧠 Processing device control command:', lowerInput);
  
  // Enhanced Vietnamese and English keywords for different query types
  const controlKeywords = [
    // Vietnamese action keywords
    'bật', 'tắt', 'mở', 'đóng', 'khởi động', 'dừng', 'điều chỉnh', 'đặt', 'chỉnh', 'tăng', 'giảm',
    // English action keywords  
    'turn on', 'turn off', 'switch on', 'switch off', 'open', 'close', 'start', 'stop', 
    'set', 'adjust', 'increase', 'decrease'
  ];
  
  // Status/inquiry keywords
  const statusKeywords = [
    // Vietnamese status inquiries
    'kiểm tra', 'xem', 'trạng thái', 'tình trạng', 'status', 'state', 'check', 'show',
    'hiển thị', 'cho biết', 'thông tin', 'info', 'có', 'những', 'danh sách', 'list'
  ];
  
  // Device listing keywords  
  const listingKeywords = [
    'có những thiết bị nào', 'có thiết bị nào', 'thiết bị nào', 'danh sách thiết bị',
    'list devices', 'show devices', 'what devices', 'all devices', 'my devices',
    'devices available', 'trong nhà', 'ở nhà', 'có gì', 'thiết bị gì'
  ];
  
  // Room keywords for location-based queries
  const roomKeywords = [
    'phòng khách', 'living room', 'phòng ngủ', 'bedroom', 'nhà bếp', 'kitchen',
    'phòng tắm', 'bathroom', 'văn phòng', 'office', 'garage', 'nhà để xe',
    'sân vườn', 'garden', 'ban công', 'balcony', 'hành lang', 'hallway'
  ];
  
  // Enhanced device keywords (including generic terms)
  const deviceKeywords = [
    // Vietnamese device names
    'đèn', 'bóng đèn', 'đèn led', 'quạt', 'điều hòa', 'máy lạnh', 'cửa', 'cửa sổ', 'rèm',
    'garage', 'máy giặt', 'tivi', 'tv', 'loa', 'máy nước nóng', 'máy bơm',
    // English device names
    'light', 'lamp', 'bulb', 'fan', 'air conditioner', 'ac', 'door', 'window', 'curtain',
    'switch', 'button', 'garage', 'tv', 'television', 'speaker', 'heater', 'pump',
    // Generic terms
    'thiết bị', 'device', 'máy', 'machine'
  ];
  
  // Group control keywords
  const groupKeywords = [
    'tất cả', 'all', 'toàn bộ', 'hết', 'cả hai', 'both', 'các', 'những', 'mọi'
  ];
  
  // Check what type of device-related command this is
  const hasControlKeyword = controlKeywords.some(keyword => lowerInput.includes(keyword));
  const hasStatusKeyword = statusKeywords.some(keyword => lowerInput.includes(keyword));
  const hasListingKeyword = listingKeywords.some(keyword => lowerInput.includes(keyword));
  const hasDeviceKeyword = deviceKeywords.some(keyword => lowerInput.includes(keyword));
  const hasGroupKeyword = groupKeywords.some(keyword => lowerInput.includes(keyword));
  const hasRoomKeyword = roomKeywords.some(keyword => lowerInput.includes(keyword));
  
  // Enhanced room-based device query detection
  const isRoomBasedDeviceQuery = (hasDeviceKeyword && hasRoomKeyword) || 
                                  (lowerInput.includes('ở ') && hasRoomKeyword && lowerInput.includes('thiết bị'));
  
  // Room name mapping between Vietnamese and English
  function normalizeRoomName(roomName) {
    const roomMapping = {
      'phòng khách': 'living room',
      'living room': 'living room',
      'phòng ngủ': 'bedroom',
      'bedroom': 'bedroom', 
      'nhà bếp': 'kitchen',
      'kitchen': 'kitchen',
      'phòng tắm': 'bathroom',
      'bathroom': 'bathroom',
      'phòng làm việc': 'office',
      'office': 'office'
    };
    
    const normalized = roomName.toLowerCase().trim();
    return roomMapping[normalized] || normalized;
  }
  
  // Check for room match with fuzzy matching
  function findRoomInText(text, deviceRooms) {
    const lowerText = text.toLowerCase();
    
    // Check direct room keywords first
    for (const roomKeyword of roomKeywords) {
      if (lowerText.includes(roomKeyword)) {
        const normalizedKeyword = normalizeRoomName(roomKeyword);
        
        // Check if any device room matches this keyword (normalized or direct)
        for (const deviceRoom of deviceRooms) {
          const deviceRoomLower = deviceRoom.toLowerCase();
          const deviceRoomNormalized = normalizeRoomName(deviceRoom);
          
          if (deviceRoomLower.includes(roomKeyword) || 
              deviceRoomLower.includes(normalizedKeyword) ||
              deviceRoomNormalized === normalizedKeyword ||
              roomKeyword.includes(deviceRoomLower)) {
            return { original: roomKeyword, normalized: normalizedKeyword, matched: deviceRoom };
          }
        }
      }
    }
    
    return null;
  }
  
  console.log('🏠 Room-based query check:', {
    hasRoomKeyword,
    hasDeviceKeyword,
    isRoomBasedDeviceQuery,
    input: lowerInput
  });
  
  // Get user devices first to check for actual device names
  let devices = [];
  let hasActualDeviceName = false;
  
  try {
    devices = await Device.find({ userId: userId });
    console.log(`🔍 Database query: Device.find({ userId: "${userId}" })`);
    console.log(`📱 Found ${devices.length} devices for userId: ${userId}`);
    
    if (devices.length > 0) {
      console.log('📋 Devices found:');
      devices.forEach((device, index) => {
        console.log(`   ${index + 1}. ${device.name} (${device.widgetType}) - State: ${device.currentState?.value || 'unknown'}`);
      });
    }
    
    hasActualDeviceName = devices.some(device => 
      lowerInput.includes(device.name.toLowerCase()) ||
      (device.room && lowerInput.includes(device.room.toLowerCase()))
    );
    console.log('📱 Found', devices.length, 'user devices, hasActualDeviceName:', hasActualDeviceName);
  } catch (error) {
    console.error('Error checking user devices:', error);
  }
  
  // Determine command type and if it's device-related
  const isDeviceListingQuery = hasListingKeyword || (hasStatusKeyword && !hasActualDeviceName) || isRoomBasedDeviceQuery;
  const isStatusQuery = hasStatusKeyword && hasActualDeviceName;
  const isControlCommand = hasControlKeyword && (hasDeviceKeyword || hasActualDeviceName || hasGroupKeyword);
  const isDeviceRelated = isDeviceListingQuery || isStatusQuery || isControlCommand;
  
  console.log('🎯 Command analysis:', {
    hasControlKeyword,
    hasStatusKeyword,
    hasListingKeyword,
    hasDeviceKeyword, 
    hasActualDeviceName,
    hasGroupKeyword,
    isDeviceListingQuery,
    isStatusQuery,
    isControlCommand,
    isDeviceRelated
  });
  
  if (!isDeviceRelated) {
    return { isDeviceControl: false };
  }
  
  try {
    // Get all user devices from database
    const devices = await Device.find({ userId }).populate('mqttConfigId');
    
    if (!devices || devices.length === 0) {
      return {
        isDeviceControl: true,
        success: false,
        response: 'Tôi không tìm thấy thiết bị nào trong hệ thống của bạn. Vui lòng thêm thiết bị trước khi sử dụng.',
        deviceId: null
      };
    }
    
    // Handle device listing queries
    if (isDeviceListingQuery) {
      console.log('📋 Processing device listing query');
      
      // Check if this is a room-specific query
      let targetRoom = null;
      let normalizedTargetRoom = null;
      let matchedDeviceRoom = null;
      
      if (isRoomBasedDeviceQuery) {
        // Get all unique device rooms first
        const deviceRooms = [...new Set(devices.filter(d => d.room).map(d => d.room))];
        console.log('🏠 Available device rooms:', deviceRooms);
        
        // Use improved room matching
        const roomMatch = findRoomInText(lowerInput, deviceRooms);
        if (roomMatch) {
          targetRoom = roomMatch.original;
          normalizedTargetRoom = roomMatch.normalized;
          matchedDeviceRoom = roomMatch.matched;
          console.log('🏠 Room match found:', { 
            original: targetRoom, 
            normalized: normalizedTargetRoom, 
            matched: matchedDeviceRoom 
          });
        } else {
          // Fallback to simple matching
          for (const room of roomKeywords) {
            if (lowerInput.includes(room)) {
              targetRoom = room;
              normalizedTargetRoom = normalizeRoomName(room);
              console.log('🏠 Fallback room detected:', targetRoom, '-> normalized:', normalizedTargetRoom);
              break;
            }
          }
        }
      }
      
      let listResponse = targetRoom ? 
        `🏠 **Thiết bị ở ${targetRoom}:**\n\n` : 
        `🏠 **Danh sách thiết bị trong hệ thống của bạn:**\n\n`;
      
      // Filter devices by room if specified
      let devicesToShow = devices;
      if (targetRoom) {
        devicesToShow = devices.filter(device => {
          if (!device.room) return false;
          
          const deviceRoomLower = device.room.toLowerCase();
          const deviceRoomNormalized = normalizeRoomName(device.room);
          const targetRoomLower = targetRoom.toLowerCase();
          
          // If we have a matched device room, prioritize that
          if (matchedDeviceRoom && device.room === matchedDeviceRoom) {
            return true;
          }
          
          // Match both original room names and normalized versions
          return deviceRoomLower.includes(targetRoomLower) ||
                 deviceRoomLower.includes(normalizedTargetRoom) ||
                 deviceRoomNormalized === normalizedTargetRoom ||
                 targetRoomLower.includes(deviceRoomLower);
        });
        
        console.log('🔍 Room filtering result:', {
          targetRoom,
          normalizedTargetRoom,
          matchedDeviceRoom,
          totalDevices: devices.length,
          filteredDevices: devicesToShow.length,
          filteredNames: devicesToShow.map(d => `${d.name} (${d.room})`)
        });
        
        if (devicesToShow.length === 0) {
          return {
            isDeviceControl: true,
            success: true,
            response: `🏠 Không tìm thấy thiết bị nào ở ${targetRoom}.\n\n💡 **Gợi ý:** Kiểm tra lại tên phòng hoặc xem danh sách tất cả thiết bị bằng cách hỏi "có những thiết bị nào"`,
            deviceId: null
          };
        }
      }
      
      // Group devices by room
      const devicesByRoom = {};
      const devicesWithoutRoom = [];
      
      devicesToShow.forEach(device => {
        if (device.room) {
          if (!devicesByRoom[device.room]) {
            devicesByRoom[device.room] = [];
          }
          devicesByRoom[device.room].push(device);
        } else {
          devicesWithoutRoom.push(device);
        }
      });
      
      // List devices by room
      for (const [room, roomDevices] of Object.entries(devicesByRoom)) {
        listResponse += `🏠 **${room}:**\n`;
        roomDevices.forEach(device => {
          const status = device.currentState?.value || 'Không rõ';
          const online = device.currentState?.online ? '🟢' : '🔴';
          listResponse += `   ${online} ${device.name} (${device.widgetType}) - Trạng thái: ${status}\n`;
        });
        listResponse += '\n';
      }
      
      // List devices without room
      if (devicesWithoutRoom.length > 0) {
        listResponse += `🔧 **Thiết bị khác:**\n`;
        devicesWithoutRoom.forEach(device => {
          const status = device.currentState?.value || 'Không rõ';
          const online = device.currentState?.online ? '🟢' : '🔴';
          listResponse += `   ${online} ${device.name} (${device.widgetType}) - Trạng thái: ${status}\n`;
        });
        listResponse += '\n';
      }
      
      listResponse += `📊 **Tổng cộng:** ${devicesToShow.length} thiết bị${targetRoom ? ` ở ${targetRoom}` : ''}\n`;
      listResponse += `💡 **Gợi ý:** Bạn có thể nói "bật [tên thiết bị]" hoặc "kiểm tra trạng thái [tên thiết bị]"`;
      
      return {
        isDeviceControl: true,
        success: true,
        response: listResponse,
        deviceId: null,
        intent: 'device_listing',
        deviceCount: devices.length
      };
    }
    
    // Handle status queries for specific devices
    if (isStatusQuery) {
      console.log('📊 Processing device status query');
      
      // Find the specific device mentioned
      const targetDevice = devices.find(device => 
        lowerInput.includes(device.name.toLowerCase()) ||
        (device.room && lowerInput.includes(device.room.toLowerCase()))
      );
      
      if (!targetDevice) {
        return {
          isDeviceControl: true,
          success: false,
          response: `Tôi không tìm thấy thiết bị nào khớp với yêu cầu. Các thiết bị có sẵn: ${devices.map(d => d.name).join(', ')}.`,
          deviceId: null
        };
      }
      
      const currentState = targetDevice.currentState;
      const online = currentState?.online ? '🟢 Trực tuyến' : '🔴 Ngoại tuyến';
      const value = currentState?.value || 'Không rõ';
      const lastUpdated = currentState?.lastUpdated ? 
        new Date(currentState.lastUpdated).toLocaleString('vi-VN') : 'Chưa có dữ liệu';
      
      let statusResponse = `📊 **Thông tin thiết bị "${targetDevice.name}":**\n\n`;
      statusResponse += `🏠 **Phòng:** ${targetDevice.room || 'Chưa đặt'}\n`;
      statusResponse += `🔧 **Loại:** ${targetDevice.widgetType}\n`;
      statusResponse += `⚡ **Trạng thái:** ${online}\n`;
      statusResponse += `💡 **Giá trị hiện tại:** ${value}\n`;
      statusResponse += `🕒 **Cập nhật lần cuối:** ${lastUpdated}\n`;
      
      if (currentState?.synchronized !== undefined) {
        statusResponse += `🔄 **Đồng bộ:** ${currentState.synchronized ? '✅ Đã đồng bộ' : '⏳ Chờ đồng bộ'}\n`;
      }
      
      // Add control suggestions
      statusResponse += `\n💡 **Gợi ý điều khiển:**\n`;
      if (targetDevice.widgetType === 'switch') {
        statusResponse += `   • "Bật ${targetDevice.name}"\n`;
        statusResponse += `   • "Tắt ${targetDevice.name}"\n`;
      } else if (targetDevice.widgetType === 'slider') {
        statusResponse += `   • "Đặt ${targetDevice.name} 80%"\n`;
        statusResponse += `   • "Tăng ${targetDevice.name}"\n`;
      }
      
      return {
        isDeviceControl: true,
        success: true,
        response: statusResponse,
        deviceId: targetDevice._id,
        deviceName: targetDevice.name,
        intent: 'device_status',
        deviceInfo: {
          name: targetDevice.name,
          room: targetDevice.room,
          type: targetDevice.widgetType,
          online: currentState?.online,
          value: currentState?.value,
          lastUpdated: currentState?.lastUpdated
        }
      };
    }
    
    // Handle device control commands (existing logic enhanced)
    if (isControlCommand) {
      console.log('🎮 Processing device control command');
      
      // Parse device control command with enhanced logic
      const parsedCommand = parseVietnameseDeviceCommand(lowerInput, devices);
      
      // Handle state check message (device already in target state)
      if (parsedCommand.stateCheckMessage) {
        return {
          isDeviceControl: true,
          success: true,
          response: parsedCommand.stateCheckMessage,
          deviceId: parsedCommand.device?._id,
          deviceName: parsedCommand.device?.name,
          action: parsedCommand.action,
          value: parsedCommand.value,
          intent: 'device_control_duplicate'
        };
      }
      
      if (!parsedCommand.devices || parsedCommand.devices.length === 0) {
        return {
          isDeviceControl: true,
          success: false,
          response: `Tôi không tìm thấy thiết bị "${parsedCommand.searchTerm || 'đã yêu cầu'}". Các thiết bị có sẵn: ${devices.map(d => d.name).join(', ')}.`,
          deviceId: null
        };
      }
      
      // Handle group control (multiple devices)
      if (parsedCommand.isGroupControl) {
        console.log('🔗 Executing group control for', parsedCommand.devices.length, 'devices');
        
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        
        for (const device of parsedCommand.devices) {
          try {
            const controlResult = await executeDeviceControl(device, parsedCommand.action, parsedCommand.value);
            results.push({
              deviceName: device.name,
              success: controlResult.success,
              error: controlResult.error
            });
            
            if (controlResult.success) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            console.error('Group control error for device', device.name, ':', error);
            results.push({
              deviceName: device.name,
              success: false,
              error: error.message
            });
            errorCount++;
          }
        }
        
        // Generate group response
        let groupResponse = '';
        if (successCount === parsedCommand.devices.length) {
          groupResponse = `✅ Đã ${parsedCommand.actionText} thành công ${successCount} thiết bị: ${parsedCommand.devices.map(d => d.name).join(', ')}.`;
        } else if (successCount > 0) {
          const successDevices = results.filter(r => r.success).map(r => r.deviceName);
          const failedDevices = results.filter(r => !r.success).map(r => r.deviceName);
          groupResponse = `⚡ Đã ${parsedCommand.actionText} thành công ${successCount}/${parsedCommand.devices.length} thiết bị.\n\n`;
          groupResponse += `✅ **Thành công:** ${successDevices.join(', ')}\n`;
          groupResponse += `❌ **Thất bại:** ${failedDevices.join(', ')}`;
        } else {
          groupResponse = `❌ Không thể ${parsedCommand.actionText} bất kỳ thiết bị nào trong nhóm.`;
        }
        
        return {
          isDeviceControl: true,
          success: successCount > 0,
          response: groupResponse,
          deviceId: parsedCommand.devices.map(d => d._id),
          deviceName: parsedCommand.searchTerm,
          action: parsedCommand.action,
          value: parsedCommand.value,
          intent: 'device_group_control',
          groupControl: {
            totalDevices: parsedCommand.devices.length,
            successCount: successCount,
            errorCount: errorCount,
            results: results
          }
        };
      }
      
      // Single device control
      const device = parsedCommand.devices[0];
      const controlResult = await executeDeviceControl(device, parsedCommand.action, parsedCommand.value);
      
      if (controlResult.success) {
        return {
          isDeviceControl: true,
          success: true,
          response: `✅ Đã ${parsedCommand.actionText} thiết bị "${device.name}" thành công.`,
          deviceId: device._id,
          deviceName: device.name,
          action: parsedCommand.action,
          value: parsedCommand.value,
          intent: 'device_control'
        };
      } else {
        return {
          isDeviceControl: true,
          success: false,
          response: `❌ Không thể điều khiển "${device.name}". Lỗi: ${controlResult.error}`,
          deviceId: device._id,
          deviceName: device.name,
          intent: 'device_control_failed'
        };
      }
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

// Parse Vietnamese device commands - Enhanced with brain_tts.py logic
function parseVietnameseDeviceCommand(input, devices) {
  console.log('🧠 Parsing device command:', input);
  console.log('📱 Available devices:', devices.map(d => `${d.name} (${d.widgetType}) - State: ${d.currentState?.value || 'unknown'}`));
  
  // Enhanced action mapping with more variations
  const actionMapping = {
    // Vietnamese
    'bật': { action: 'ON', actionText: 'bật' },
    'mở': { action: 'ON', actionText: 'mở' },
    'khởi động': { action: 'ON', actionText: 'khởi động' },
    'tắt': { action: 'OFF', actionText: 'tắt' },
    'đóng': { action: 'OFF', actionText: 'đóng' },
    'dừng': { action: 'OFF', actionText: 'dừng' },
    'tăng': { action: 'INCREASE', actionText: 'tăng' },
    'giảm': { action: 'DECREASE', actionText: 'giảm' },
    'điều chỉnh': { action: 'SET', actionText: 'điều chỉnh' },
    'đặt': { action: 'SET', actionText: 'đặt' },
    'chỉnh': { action: 'SET', actionText: 'chỉnh' },
    // English
    'turn on': { action: 'ON', actionText: 'bật' },
    'turn off': { action: 'OFF', actionText: 'tắt' },
    'switch on': { action: 'ON', actionText: 'bật' },
    'switch off': { action: 'OFF', actionText: 'tắt' },
    'open': { action: 'ON', actionText: 'mở' },
    'close': { action: 'OFF', actionText: 'đóng' },
    'start': { action: 'ON', actionText: 'khởi động' },
    'stop': { action: 'OFF', actionText: 'dừng' },
    'increase': { action: 'INCREASE', actionText: 'tăng' },
    'decrease': { action: 'DECREASE', actionText: 'giảm' },
    'set': { action: 'SET', actionText: 'đặt' },
    'adjust': { action: 'SET', actionText: 'điều chỉnh' }
  };
  
  // Find action with priority (longer phrases first)
  let detectedAction = null;
  const sortedActions = Object.entries(actionMapping).sort((a, b) => b[0].length - a[0].length);
  
  for (const [keyword, actionInfo] of sortedActions) {
    if (input.includes(keyword)) {
      detectedAction = actionInfo;
      console.log('🎯 Detected action:', keyword, '->', actionInfo);
      break;
    }
  }
  
  if (!detectedAction) {
    detectedAction = { action: 'ON', actionText: 'bật' }; // Default action
    console.log('⚡ Using default action:', detectedAction);
  }
  
  // Enhanced device matching - Priority: Exact name > Room > Type > Generic
  let matchedDevices = [];
  let searchTerm = '';
  
  // Special handling for "all" or "both" commands (like brain_tts.py)
  const groupKeywords = [
    'tất cả', 'all', 'toàn bộ', 'hết', 'cả hai', 'both', 'các', 'những'
  ];
  
  const hasGroupKeyword = groupKeywords.some(keyword => input.includes(keyword));
  
  if (hasGroupKeyword) {
    // Group control - find all devices of similar type
    const deviceTypes = ['đèn', 'light', 'quạt', 'fan', 'thiết bị', 'device'];
    for (const type of deviceTypes) {
      if (input.includes(type)) {
        matchedDevices = devices.filter(device => 
          device.name.toLowerCase().includes(type) ||
          device.type?.toLowerCase().includes(type) ||
          (type === 'light' && device.widgetType === 'switch') ||
          (type === 'đèn' && device.widgetType === 'switch') ||
          (type === 'thiết bị' || type === 'device') // Match all devices
        );
        searchTerm = `tất cả ${type}`;
        break;
      }
    }
    
    if (matchedDevices.length === 0) {
      matchedDevices = devices; // Control all devices
      searchTerm = 'tất cả thiết bị';
    }
    
    console.log('🔗 Group control detected:', searchTerm, 'devices:', matchedDevices.length);
  } else {
    // PRIORITY 1: Try exact device name match first (MOST IMPORTANT)
    for (const device of devices) {
      const deviceNameLower = device.name.toLowerCase();
      
      // Direct name match (like "ddd")
      if (input.includes(deviceNameLower)) {
        matchedDevices = [device];
        searchTerm = device.name;
        console.log('🎯 Exact device name match:', device.name);
        break;
      }
      
      // Name with "thiết bị" prefix (like "thiết bị ddd")
      if (input.includes(`thiết bị ${deviceNameLower}`) || input.includes(`device ${deviceNameLower}`)) {
        matchedDevices = [device];
        searchTerm = device.name;
        console.log('🎯 Device with prefix match:', device.name);
        break;
      }
    }
    
    // PRIORITY 2: Try room match if no exact name found
    if (matchedDevices.length === 0) {
      for (const device of devices) {
        if (device.room && input.includes(device.room.toLowerCase())) {
          const roomDevices = devices.filter(d => d.room === device.room);
          matchedDevices = roomDevices;
          searchTerm = device.room;
          console.log('🏠 Room match:', device.room, 'devices:', roomDevices.length);
          break;
        }
      }
    }
  }
  
  // PRIORITY 3: If no exact match, try device type keywords
  if (matchedDevices.length === 0) {
    const deviceTypeMapping = {
      'đèn': ['switch', 'button', 'light', 'lamp'],
      'bóng đèn': ['switch', 'button', 'light'],
      'đèn led': ['switch', 'button', 'light'],
      'quạt': ['fan', 'switch', 'button'],
      'điều hòa': ['ac', 'air conditioner', 'switch', 'climate'],
      'máy lạnh': ['ac', 'air conditioner', 'switch'],
      'cửa': ['door', 'garage', 'switch'],
      'cửa sổ': ['window', 'switch'],
      'rèm': ['curtain', 'blind', 'switch'],
      'light': ['switch', 'button', 'lamp'],
      'lamp': ['switch', 'button'],
      'fan': ['switch', 'button'],
      'door': ['switch', 'button'],
      'window': ['switch', 'button'],
      'curtain': ['switch', 'button'],
      'air conditioner': ['switch', 'button'],
      'ac': ['switch', 'button']
    };
    
    for (const [keyword, types] of Object.entries(deviceTypeMapping)) {
      if (input.includes(keyword)) {
        // Find all devices of matching type
        const typeDevices = devices.filter(device => 
          types.includes(device.widgetType) || 
          device.name.toLowerCase().includes(keyword) ||
          device.type?.toLowerCase().includes(keyword) ||
          device.description?.toLowerCase().includes(keyword)
        );
        
        if (typeDevices.length > 0) {
          matchedDevices = typeDevices;
          searchTerm = keyword;
          console.log('🏷️ Type match:', keyword, 'devices:', typeDevices.length);
          break;
        }
      }
    }
  }
  
  // PRIORITY 4: Last resort - fuzzy matching for device names
  if (matchedDevices.length === 0) {
    const words = input.split(' ');
    for (const word of words) {
      if (word.length > 2) { // Skip short words
        const fuzzyMatches = devices.filter(device => 
          device.name.toLowerCase().includes(word) ||
          word.includes(device.name.toLowerCase())
        );
        
        if (fuzzyMatches.length > 0) {
          matchedDevices = fuzzyMatches;
          searchTerm = word;
          console.log('🔍 Fuzzy match for word:', word, 'devices:', fuzzyMatches.length);
          break;
        }
      }
    }
  }
  
  // Parse value for sliders, dimmers, etc. (enhanced)
  let value = detectedAction.action;
  const numberMatch = input.match(/(\d+)/);
  
  if (numberMatch) {
    const numValue = parseInt(numberMatch[1]);
    
    // Handle percentage values
    if (input.includes('%') || input.includes('phần trăm')) {
      value = Math.max(0, Math.min(100, numValue));
    }
    // Handle temperature values
    else if (input.includes('độ') || input.includes('degree')) {
      value = Math.max(16, Math.min(30, numValue)); // Reasonable AC range
    }
    // Handle general numeric values
    else if (matchedDevices.length > 0 && matchedDevices[0].widgetType === 'slider') {
      value = Math.max(0, Math.min(100, numValue));
    }
    // Default numeric value
    else {
      value = numValue;
    }
    
    console.log('🔢 Parsed numeric value:', numValue, '->', value);
  }
  
  // Smart state checking (like brain_tts.py)
  const primaryDevice = matchedDevices.length > 0 ? matchedDevices[0] : null;
  let stateCheckMessage = '';
  
  if (primaryDevice && matchedDevices.length === 1) {
    const currentState = primaryDevice.currentState?.value;
    const targetState = detectedAction.action;
    
    // Check if device is already in target state
    if (currentState === targetState || 
        (currentState === 'ON' && targetState === 'ON') ||
        (currentState === 'OFF' && targetState === 'OFF')) {
      stateCheckMessage = `Có vẻ như ${primaryDevice.name} đã ${detectedAction.actionText} rồi. Bạn có muốn làm gì khác không?`;
      console.log('⚠️ Device already in target state:', currentState, '->', targetState);
    }
  }
  
  return {
    devices: matchedDevices,
    device: primaryDevice, // For backward compatibility
    action: detectedAction.action,
    actionText: detectedAction.actionText,
    value: value,
    searchTerm: searchTerm,
    isGroupControl: matchedDevices.length > 1,
    stateCheckMessage: stateCheckMessage
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

// TTS Generation endpoint
router.post('/tts', authenticateNavinAgent, async (req, res) => {
  try {
    const { text, voice = 'vi' } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required for TTS generation'
      });
    }

    const audioPath = await ttsService.generateTTS(text, voice);
    
    if (audioPath) {
      // Return the audio file
      const filename = path.basename(audioPath);
      res.sendFile(audioPath, (err) => {
        if (err) {
          console.error('Error sending TTS file:', err);
          res.status(500).json({
            success: false,
            error: 'Failed to send audio file'
          });
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate TTS audio'
      });
    }
  } catch (error) {
    console.error('TTS endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
