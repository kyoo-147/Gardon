const express = require('express');
const { body, validationResult } = require('express-validator');
const Device = require('../models/Device');
const MqttConfig = require('../models/MqttConfig');
const MqttMember = require('../models/MqttMember');
const mqttService = require('../services/mqttService');
const router = express.Router();

// Validation middleware for new device structure
const validateDevice = [
  body('name').notEmpty().trim().withMessage('Device name is required'),
  body('widgetType').isIn([
    'button', 'switch', 'slider', 'colorPicker', 
    'timePicker', 'textInput', 'multiState', 
    'chart', 'sensor', 'gauge'
  ]).withMessage('Invalid widget type'),
  body('mqtt.publishTopic').notEmpty().withMessage('Publish topic is required'),
  body('mqtt.qos').isIn([0, 1, 2]).withMessage('QoS must be 0, 1, or 2'),
  body('mqtt.payloadType').isIn(['text', 'json']).withMessage('Payload type must be text or json'),
  body('mqttConfigId').notEmpty().withMessage('MQTT configuration ID is required'),
  body('room').optional().trim(),
  body('description').optional().trim(),
  body('icon').optional().trim(),
];

// GET /api/devices - Get all devices for a user or MQTT config
router.get('/', async (req, res) => {
  try {
    const { userId, mqttConfigId, room } = req.query;
    
    if (!userId && !mqttConfigId) {
      return res.status(400).json({ error: 'User ID or MQTT Config ID is required' });
    }

    let filter = {};
    
    if (mqttConfigId) {
      // Check if user has access to this MQTT config
      const config = await MqttConfig.findById(mqttConfigId);
      if (!config) {
        return res.status(404).json({ error: 'MQTT configuration not found' });
      }

      // Check if user is owner or member
      const isOwner = config.userId === userId;
      const isMember = await MqttMember.findOne({
        mqttConfigId: mqttConfigId,
        userId: userId,
        status: 'active'
      });

      if (!isOwner && !isMember) {
        return res.status(403).json({ error: 'Access denied to this MQTT configuration' });
      }

      filter.mqttConfigId = mqttConfigId;
    } else {
      filter.userId = userId;
    }

    if (room) {
      filter.room = room;
    }

    const devices = await Device.find(filter)
      .populate('mqttConfigId', 'name host port')
      .sort({ room: 1, name: 1 });

    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/devices/rooms - Get all rooms for a user
router.get('/rooms', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const rooms = await Device.distinct('room', { userId });
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/devices/:id - Get specific device
router.get('/:id', async (req, res) => {
  try {
    const device = await Device.findById(req.params.id).populate('mqttConfigId');
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/devices - Create new device
router.post('/', validateDevice, async (req, res) => {
  try {
    console.log('📥 Received device data:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const device = new Device(req.body);
    await device.save();
    
    const populatedDevice = await Device.findById(device._id).populate('mqttConfigId');
    console.log('✅ Device created successfully:', populatedDevice._id);
    res.status(201).json(populatedDevice);
  } catch (error) {
    console.error('Error creating device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/devices/:id - Update device
router.put('/:id', validateDevice, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const device = await Device.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('mqttConfigId');

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/devices/:id - Delete device
router.delete('/:id', async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/devices/:id/control - Control device with state management
router.post('/:id/control', async (req, res) => {
  try {
    const { command, value } = req.body;
    
    console.log('📥 Device control request:', { deviceId: req.params.id, command, value });
    
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Check if there's already a pending command
    const syncStatus = device.getSyncStatus();
    if (syncStatus.pendingCommand && syncStatus.pendingCommand.status === 'pending') {
      const timeRemaining = syncStatus.pendingCommand.timeoutAt - new Date();
      
      if (timeRemaining > 0) {
        return res.status(409).json({ 
          error: 'Another command is pending',
          pendingCommand: syncStatus.pendingCommand,
          timeRemaining: Math.ceil(timeRemaining / 1000)
        });
      }
    }

    // Prepare message based on device payload type
    let message;
    let commandValue = value;
    
    // Handle different widget types with proper value transformation
    switch (device.widgetType) {
      case 'switch':
        commandValue = command === 'ON' ? 'ON' : 'OFF';
        break;
      case 'button':
        commandValue = command;
        break;
      case 'slider':
        commandValue = Number(value);
        break;
      case 'colorPicker':
        commandValue = value; // hex color string
        break;
      default:
        commandValue = value !== undefined ? value : command;
    }

    if (device.mqtt.payloadType === 'json') {
      // For JSON payload, create structured data
      message = JSON.stringify({ 
        command, 
        value: commandValue, 
        timestamp: new Date().toISOString(),
        deviceId: device._id 
      });
    } else {
      // For text payload, use simple string
      if (commandValue !== undefined && commandValue !== null) {
        message = commandValue.toString();
      } else if (command !== undefined && command !== null) {
        message = command.toString();
      } else {
        message = 'ON'; // Default fallback
      }
    }

    console.log('📤 Publishing MQTT message:', {
      topic: device.mqtt.publishTopic,
      message,
      qos: device.mqtt.qos,
      retain: device.mqtt.retain
    });

    // Set desired state and pending command
    device.setDesiredState(command, commandValue, 30000); // 30 second timeout

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
      // Since MQTT publish was successful, immediately update the current state
      // This ensures UI consistency and remembers the last successful state
      device.currentState.value = commandValue;
      device.currentState.reportedState = commandValue;
      device.currentState.synchronized = true;
      device.currentState.lastUpdated = new Date();
      device.currentState.online = true;
      
      // Clear pending command since we consider publish success as execution success
      device.currentState.pendingCommand = undefined;
      
      // Add to history
      device.addStateHistory(commandValue, 'confirmed', command);
      
      // Save the device with new state
      await device.save();

      console.log('✅ Device control successful - state updated to:', commandValue);
      res.json({ 
        success: true, 
        message: 'Command sent successfully',
        topic: device.mqtt.publishTopic,
        payload: message,
        qos: device.mqtt.qos,
        retain: device.mqtt.retain,
        currentValue: commandValue,
        state: {
          value: device.currentState.value,
          desiredState: device.currentState.desiredState,
          reportedState: device.currentState.reportedState,
          synchronized: device.currentState.synchronized,
          lastUpdated: device.currentState.lastUpdated,
          online: device.currentState.online
        }
      });
    } else {
      console.log('❌ MQTT publish failed - not connected');
      res.status(400).json({ 
        success: false, 
        message: 'Failed to send command - MQTT not connected' 
      });
    }
  } catch (error) {
    console.error('Error controlling device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/devices/:id/status - Get device status
router.get('/:id/status', async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const isConnected = mqttService.isConnected(device.userId);

    res.json({
      deviceId: device._id,
      name: device.name,
      widgetType: device.widgetType,
      currentState: device.currentState,
      mqtt: {
        publishTopic: device.mqtt.publishTopic,
        subscribeTopic: device.mqtt.subscribeTopic,
        qos: device.mqtt.qos,
        retain: device.mqtt.retain,
        payloadType: device.mqtt.payloadType
      },
      mqttConnected: isConnected,
      isEnabled: device.isEnabled,
      room: device.room,
      icon: device.icon,
      lastUpdated: device.currentState.lastUpdated
    });
  } catch (error) {
    console.error('Error getting device status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/devices/:id/status - Get device status with sync information
router.get('/:id/status', async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const isConnected = mqttService.isConnected(device.userId);
    const syncStatus = device.getSyncStatus();
    
    res.json({
      deviceId: device._id,
      name: device.name,
      widgetType: device.widgetType,
      mqtt: {
        connected: isConnected,
        publishTopic: device.mqtt.publishTopic,
        subscribeTopic: device.mqtt.subscribeTopic
      },
      state: {
        currentValue: device.currentState.value,
        desiredState: device.currentState.desiredState,
        reportedState: device.currentState.reportedState,
        synchronized: device.currentState.synchronized,
        online: device.currentState.online,
        lastUpdated: device.currentState.lastUpdated,
        lastSeen: device.currentState.lastSeen
      },
      pendingCommand: syncStatus.pendingCommand,
      lastConfirmedCommand: device.currentState.lastConfirmedCommand,
      recentHistory: device.currentState.history.slice(-10) // Last 10 entries
    });
  } catch (error) {
    console.error('Error getting device status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/devices/bulk-control - Control multiple devices
router.post('/bulk-control', async (req, res) => {
  try {
    const { deviceIds, command, value } = req.body;
    
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({ error: 'Device IDs array is required' });
    }

    const devices = await Device.find({ _id: { $in: deviceIds } });
    const results = [];

    for (const device of devices) {
      let message = command;
      if (value !== undefined) {
        message = typeof value === 'object' ? JSON.stringify(value) : value.toString();
      }

      const success = mqttService.publishMessage(
        device.userId,
        device.topic.command,
        message
      );

      results.push({
        deviceId: device._id,
        name: device.name,
        success,
        topic: device.topic.command,
        payload: message
      });
    }

    res.json({
      success: true,
      message: `Commands sent to ${results.length} devices`,
      results
    });
  } catch (error) {
    console.error('Error bulk controlling devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
