const express = require('express');
const { body, validationResult } = require('express-validator');
const MqttConfig = require('../models/MqttConfig');
const MqttMember = require('../models/MqttMember');
const router = express.Router();

// Validation middleware
const validateMqttConfig = [
  body('name').notEmpty().withMessage('Name is required'),
  body('host').notEmpty().withMessage('Host is required'),
  body('port').isInt({ min: 1, max: 65535 }).withMessage('Port must be between 1 and 65535'),
  body('clientId').notEmpty().withMessage('Client ID is required'),
];

// GET /api/mqtt-config - Get all MQTT configurations for a user (owned only)
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const configs = await MqttConfig.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
    res.json(configs);
  } catch (error) {
    console.error('Error fetching MQTT configs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mqtt-config/all - Get all MQTT configurations user has access to (owned + member)
router.get('/all', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get configs user owns
    const ownedConfigs = await MqttConfig.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

    // Get configs user is member of
    const memberships = await MqttMember.find({ 
      userId: userId,
      status: 'active'
    }).populate('mqttConfigId');

    const memberConfigs = memberships
      .filter(membership => membership.mqttConfigId)
      .map(membership => ({
        ...membership.mqttConfigId.toObject(),
        userRole: membership.role,
        isOwner: false
      }));

    // Combine and mark owned configs
    const allConfigs = [
      ...ownedConfigs.map(config => ({
        ...config.toObject(),
        userRole: 'admin',
        isOwner: true
      })),
      ...memberConfigs
    ];

    res.json(allConfigs);
  } catch (error) {
    console.error('Error fetching all MQTT configs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mqtt-config/:id - Get specific MQTT configuration
router.get('/:id', async (req, res) => {
  try {
    const config = await MqttConfig.findById(req.params.id);
    
    if (!config) {
      return res.status(404).json({ error: 'MQTT configuration not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching MQTT config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/mqtt-config - Create new MQTT configuration
router.post('/', validateMqttConfig, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const configData = {
      ...req.body,
      clientId: req.body.clientId || `mqtt_client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const config = new MqttConfig(configData);
    await config.save();

    res.status(201).json(config);
  } catch (error) {
    console.error('Error creating MQTT config:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Configuration with this name already exists' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/mqtt-config/:id - Update MQTT configuration
router.put('/:id', validateMqttConfig, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const config = await MqttConfig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!config) {
      return res.status(404).json({ error: 'MQTT configuration not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error updating MQTT config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/mqtt-config/:id - Delete MQTT configuration
router.delete('/:id', async (req, res) => {
  try {
    const config = await MqttConfig.findByIdAndDelete(req.params.id);

    if (!config) {
      return res.status(404).json({ error: 'MQTT configuration not found' });
    }

    res.json({ message: 'MQTT configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting MQTT config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/mqtt-config/:id/set-default - Set as default configuration
router.post('/:id/set-default', async (req, res) => {
  try {
    const config = await MqttConfig.findById(req.params.id);

    if (!config) {
      return res.status(404).json({ error: 'MQTT configuration not found' });
    }

    // Remove default from other configs
    await MqttConfig.updateMany(
      { userId: config.userId, _id: { $ne: config._id } },
      { isDefault: false }
    );

    // Set this config as default
    config.isDefault = true;
    await config.save();

    res.json(config);
  } catch (error) {
    console.error('Error setting default MQTT config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/mqtt-config/test - Test MQTT connection
router.post('/test', async (req, res) => {
  try {
    const mqtt = require('mqtt');
    const { 
      host, 
      port, 
      protocol,
      path,
      username, 
      password, 
      clientId,
      mqttVersion,
      useSSL,
      connectTimeout,
      keepAlive
    } = req.body;

    // Validate required fields
    if (!host || !port) {
      return res.status(400).json({ 
        success: false, 
        message: 'Host and port are required for connection test' 
      });
    }

    console.log('Testing MQTT connection with config:', {
      host,
      port,
      protocol,
      path,
      clientId,
      mqttVersion,
      useSSL
    });

    // Build connection URL
    let mqttUrl;
    const connectionProtocol = protocol || (useSSL ? 'wss' : 'ws');
    
    if (connectionProtocol === 'ws' || connectionProtocol === 'wss') {
      mqttUrl = `${connectionProtocol}://${host}:${port}${path || '/mqtt'}`;
    } else {
      const mqttProtocol = useSSL ? 'mqtts' : 'mqtt';
      mqttUrl = `${mqttProtocol}://${host}:${port}`;
    }

    console.log('MQTT Connection URL:', mqttUrl);

    const options = {
      clientId: clientId || `test_client_${Date.now()}`,
      username: username || undefined,
      password: password || undefined,
      connectTimeout: connectTimeout || 10000,
      keepalive: keepAlive || 60,
      clean: true,
      protocolVersion: mqttVersion === '5.0' ? 5 : 4,
      reconnectPeriod: 0 // Disable reconnection for test
    };

    console.log('MQTT Connection Options:', {
      clientId: options.clientId,
      username: options.username ? '***' : undefined,
      protocolVersion: options.protocolVersion,
      connectTimeout: options.connectTimeout
    });

    const client = mqtt.connect(mqttUrl, options);

    let testResult = null;

    const testPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('MQTT test connection timeout');
        client.end(true);
        reject(new Error('Connection timeout - Could not connect to MQTT broker within 15 seconds'));
      }, 15000);

      client.on('connect', () => {
        console.log('✅ MQTT test connection successful');
        clearTimeout(timeout);
        client.end();
        resolve({ 
          success: true, 
          message: 'Connection successful',
          url: mqttUrl,
          clientId: options.clientId
        });
      });

      client.on('error', (error) => {
        console.error('❌ MQTT test connection error:', error.message);
        clearTimeout(timeout);
        client.end(true);
        reject(new Error(`Connection failed: ${error.message}`));
      });

      client.on('offline', () => {
        console.log('MQTT test client went offline');
      });

      client.on('close', () => {
        console.log('MQTT test connection closed');
      });
    });

    testResult = await testPromise;
    res.json(testResult);

  } catch (error) {
    console.error('Error testing MQTT connection:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Connection failed',
      error: error.toString()
    });
  }
});

// POST /api/mqtt-config/test-subscribe - Test MQTT subscription
router.post('/test-subscribe', async (req, res) => {
  try {
    const mqtt = require('mqtt');
    const { 
      host, 
      port, 
      protocol,
      path,
      username, 
      password, 
      clientId,
      mqttVersion,
      useSSL,
      connectTimeout,
      keepAlive,
      testTopic
    } = req.body;

    if (!host || !port || !testTopic) {
      return res.status(400).json({ 
        success: false, 
        message: 'Host, port, and test topic are required' 
      });
    }

    console.log('Testing MQTT subscription:', { host, port, testTopic });

    // Build connection URL
    let mqttUrl;
    const connectionProtocol = protocol || (useSSL ? 'wss' : 'ws');
    
    if (connectionProtocol === 'ws' || connectionProtocol === 'wss') {
      mqttUrl = `${connectionProtocol}://${host}:${port}${path || '/mqtt'}`;
    } else {
      const mqttProtocol = useSSL ? 'mqtts' : 'mqtt';
      mqttUrl = `${mqttProtocol}://${host}:${port}`;
    }

    const options = {
      clientId: `${clientId}_sub_test`,
      username: username || undefined,
      password: password || undefined,
      connectTimeout: connectTimeout || 10000,
      keepalive: keepAlive || 60,
      clean: true,
      protocolVersion: mqttVersion === '5.0' ? 5 : 4,
      reconnectPeriod: 0
    };

    const client = mqtt.connect(mqttUrl, options);

    const testPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end(true);
        reject(new Error('Subscribe test timeout'));
      }, 10000);

      client.on('connect', () => {
        console.log('✅ Connected for subscription test');
        
        client.subscribe(testTopic, { qos: 1 }, (err) => {
          if (err) {
            clearTimeout(timeout);
            client.end(true);
            reject(new Error(`Subscribe failed: ${err.message}`));
          } else {
            console.log(`✅ Successfully subscribed to ${testTopic}`);
            clearTimeout(timeout);
            client.end();
            resolve({
              success: true,
              message: 'Successfully subscribed to test topic',
              topic: testTopic
            });
          }
        });
      });

      client.on('error', (error) => {
        clearTimeout(timeout);
        client.end(true);
        reject(new Error(`Connection failed: ${error.message}`));
      });
    });

    const result = await testPromise;
    res.json(result);

  } catch (error) {
    console.error('Error testing MQTT subscription:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Subscribe test failed'
    });
  }
});

// POST /api/mqtt-config/test-publish - Test MQTT publishing
router.post('/test-publish', async (req, res) => {
  try {
    const mqtt = require('mqtt');
    const { 
      host, 
      port, 
      protocol,
      path,
      username, 
      password, 
      clientId,
      mqttVersion,
      useSSL,
      connectTimeout,
      keepAlive,
      testTopic,
      testMessage
    } = req.body;

    if (!host || !port || !testTopic || !testMessage) {
      return res.status(400).json({ 
        success: false, 
        message: 'Host, port, test topic, and test message are required' 
      });
    }

    console.log('Testing MQTT publishing:', { host, port, testTopic });

    // Build connection URL
    let mqttUrl;
    const connectionProtocol = protocol || (useSSL ? 'wss' : 'ws');
    
    if (connectionProtocol === 'ws' || connectionProtocol === 'wss') {
      mqttUrl = `${connectionProtocol}://${host}:${port}${path || '/mqtt'}`;
    } else {
      const mqttProtocol = useSSL ? 'mqtts' : 'mqtt';
      mqttUrl = `${mqttProtocol}://${host}:${port}`;
    }

    const options = {
      clientId: `${clientId}_pub_test`,
      username: username || undefined,
      password: password || undefined,
      connectTimeout: connectTimeout || 10000,
      keepalive: keepAlive || 60,
      clean: true,
      protocolVersion: mqttVersion === '5.0' ? 5 : 4,
      reconnectPeriod: 0
    };

    const client = mqtt.connect(mqttUrl, options);

    const testPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end(true);
        reject(new Error('Publish test timeout'));
      }, 10000);

      client.on('connect', () => {
        console.log('✅ Connected for publish test');
        
        client.publish(testTopic, testMessage, { qos: 1 }, (err) => {
          if (err) {
            clearTimeout(timeout);
            client.end(true);
            reject(new Error(`Publish failed: ${err.message}`));
          } else {
            console.log(`✅ Successfully published to ${testTopic}`);
            clearTimeout(timeout);
            client.end();
            resolve({
              success: true,
              message: 'Successfully published test message',
              topic: testTopic,
              messageLength: testMessage.length
            });
          }
        });
      });

      client.on('error', (error) => {
        clearTimeout(timeout);
        client.end(true);
        reject(new Error(`Connection failed: ${error.message}`));
      });
    });

    const result = await testPromise;
    res.json(result);

  } catch (error) {
    console.error('Error testing MQTT publishing:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Publish test failed'
    });
  }
});

// Store for test messages (in production, use Redis or database)
const testMessages = new Map();

// POST /api/mqtt-config/check-messages - Check received messages
router.post('/check-messages', async (req, res) => {
  try {
    const mqtt = require('mqtt');
    const { 
      host, 
      port, 
      protocol,
      path,
      username, 
      password, 
      clientId,
      mqttVersion,
      useSSL,
      connectTimeout,
      keepAlive,
      testTopic
    } = req.body;

    if (!host || !port || !testTopic) {
      return res.status(400).json({ 
        success: false, 
        message: 'Host, port, and test topic are required' 
      });
    }

    console.log('Checking MQTT messages:', { host, port, testTopic });

    // Build connection URL
    let mqttUrl;
    const connectionProtocol = protocol || (useSSL ? 'wss' : 'ws');
    
    if (connectionProtocol === 'ws' || connectionProtocol === 'wss') {
      mqttUrl = `${connectionProtocol}://${host}:${port}${path || '/mqtt'}`;
    } else {
      const mqttProtocol = useSSL ? 'mqtts' : 'mqtt';
      mqttUrl = `${mqttProtocol}://${host}:${port}`;
    }

    const options = {
      clientId: `${clientId}_check_test`,
      username: username || undefined,
      password: password || undefined,
      connectTimeout: connectTimeout || 10000,
      keepalive: keepAlive || 60,
      clean: false, // Don't clean session to receive previous messages
      protocolVersion: mqttVersion === '5.0' ? 5 : 4,
      reconnectPeriod: 0
    };

    const client = mqtt.connect(mqttUrl, options);
    const receivedMessages = [];

    const testPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end(true);
        resolve({
          success: true,
          messagesReceived: receivedMessages.length,
          messages: receivedMessages
        });
      }, 5000); // Wait 5 seconds for messages

      client.on('connect', () => {
        console.log('✅ Connected for message check');
        
        client.subscribe(testTopic, { qos: 1 }, (err) => {
          if (err) {
            clearTimeout(timeout);
            client.end(true);
            reject(new Error(`Subscribe failed: ${err.message}`));
          } else {
            console.log(`✅ Subscribed to ${testTopic} for message check`);
          }
        });
      });

      client.on('message', (topic, message) => {
        console.log(`📨 Received message on ${topic}:`, message.toString());
        receivedMessages.push({
          topic,
          message: message.toString(),
          timestamp: new Date().toISOString()
        });
      });

      client.on('error', (error) => {
        clearTimeout(timeout);
        client.end(true);
        reject(new Error(`Connection failed: ${error.message}`));
      });
    });

    const result = await testPromise;
    res.json(result);

  } catch (error) {
    console.error('Error checking MQTT messages:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Message check failed'
    });
  }
});

// POST /api/mqtt-config/cleanup-test - Cleanup test resources
router.post('/cleanup-test', async (req, res) => {
  try {
    const { clientId } = req.body;
    
    // Clean up any stored test data
    if (clientId && testMessages.has(clientId)) {
      testMessages.delete(clientId);
    }
    
    console.log('✅ Test cleanup completed for client:', clientId);
    
    res.json({
      success: true,
      message: 'Test resources cleaned up successfully'
    });

  } catch (error) {
    console.error('Error cleaning up test:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Cleanup failed'
    });
  }
});

module.exports = router;
