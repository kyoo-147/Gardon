const mqtt = require('mqtt');
const Device = require('../models/Device');

class MqttService {
  constructor() {
    this.clients = new Map(); // userId -> mqtt client
    this.io = null;
  }

  initialize(io) {
    this.io = io;
    console.log('MQTT Service initialized');
  }

  async connectToMqtt(config, socket) {
    try {
      const { userId, mqttConfig } = config;
      
      console.log('Connecting to MQTT with config:', {
        host: mqttConfig.host,
        port: mqttConfig.port,
        protocol: mqttConfig.protocol,
        path: mqttConfig.path,
        clientId: mqttConfig.clientId
      });
      
      // Disconnect existing client if any
      if (this.clients.has(userId)) {
        console.log(`Disconnecting existing MQTT client for user ${userId}`);
        const existingClient = this.clients.get(userId);
        this.clients.delete(userId); // Remove from map first to prevent close event emission
        existingClient.end(true); // Force close without emitting close event
      }

      // Build connection URL
      const connectionUrl = this.buildConnectionUrl(mqttConfig);
      console.log('MQTT Connection URL:', connectionUrl);

      // Build connection options
      const options = this.buildConnectionOptions(mqttConfig);
      console.log('MQTT Connection Options:', {
        clientId: options.clientId,
        username: options.username ? '***' : undefined,
        keepalive: options.keepalive,
        protocolVersion: options.protocolVersion,
        clean: options.clean
      });

      const client = mqtt.connect(connectionUrl, options);

      client.on('connect', async () => {
        console.log(`✅ MQTT Connected for user ${userId}`);
        this.clients.set(userId, client);
        
        socket.emit('mqtt_connected', { 
          status: 'connected', 
          message: 'Successfully connected to MQTT broker',
          config: {
            host: mqttConfig.host,
            port: mqttConfig.port,
            protocol: mqttConfig.protocol
          }
        });

        // Subscribe to device topics
        await this.subscribeToDeviceTopics(userId, client);
      });

      client.on('error', (error) => {
        console.error(`MQTT Error for user ${userId}:`, error);
        socket.emit('mqtt_error', { 
          status: 'error', 
          message: error.message 
        });
      });

      client.on('message', async (topic, message) => {
        try {
          const payload = message.toString();
          console.log(`Received message on ${topic}: ${payload}`);
          
          // Update device state in database
          await this.updateDeviceState(userId, topic, payload);
          
          // Emit to client
          socket.emit('mqtt_message', {
            topic,
            message: payload,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error processing MQTT message:', error);
        }
      });

      client.on('close', () => {
        console.log(`MQTT Disconnected for user ${userId}`);
        // Only emit disconnect if client was still in our map (not manually removed)
        if (this.clients.has(userId)) {
          this.clients.delete(userId);
          socket.emit('mqtt_disconnected', { 
            status: 'disconnected', 
            message: 'Disconnected from MQTT broker' 
          });
        }
      });

      client.on('reconnect', () => {
        console.log(`MQTT Reconnecting for user ${userId}`);
        socket.emit('mqtt_reconnecting', { 
          status: 'reconnecting', 
          message: 'Reconnecting to MQTT broker...' 
        });
      });

    } catch (error) {
      console.error('Error connecting to MQTT:', error);
      socket.emit('mqtt_error', { 
        status: 'error', 
        message: error.message 
      });
    }
  }

  async subscribeToDeviceTopics(userId, client) {
    try {
      const devices = await Device.find({ userId, isEnabled: true });
      
      for (const device of devices) {
        // Subscribe to state/feedback topic if configured
        if (device.mqtt.subscribeTopic) {
          client.subscribe(device.mqtt.subscribeTopic, { qos: device.mqtt.qos });
          console.log(`Subscribed to ${device.mqtt.subscribeTopic} (QoS: ${device.mqtt.qos})`);
        }
      }
    } catch (error) {
      console.error('Error subscribing to device topics:', error);
    }
  }

  async updateDeviceState(userId, topic, payload) {
    try {
      // Find device by subscribe topic
      const device = await Device.findOne({
        userId,
        'mqtt.subscribeTopic': topic,
        isEnabled: true
      });

      if (device) {
        let value = payload;
        
        // Parse payload based on device configuration
        if (device.mqtt.payloadType === 'json') {
          try {
            const parsedPayload = JSON.parse(payload);
            value = parsedPayload.value || parsedPayload.state || parsedPayload;
          } catch (e) {
            console.warn(`Failed to parse JSON payload for device ${device.name}: ${payload}`);
            value = payload; // Keep as string if parse fails
          }
        }
        
        console.log(`📡 Received state update for device ${device.name}:`, value);
        
        // Check if this confirms a pending command
        const wasConfirmed = device.confirmCommand(value);
        
        // Add to history with appropriate type
        const historyType = wasConfirmed ? 'confirmed' : 'received';
        device.addStateHistory(value, historyType);
        
        // Mark device as online when receiving data
        device.currentState.online = true;
        device.currentState.lastSeen = new Date();
        
        await device.save();
        
        console.log(`✅ Updated device ${device.name} (${device.widgetType}) state:`, {
          value,
          synchronized: device.currentState.synchronized,
          wasConfirmed
        });
        
        // Emit real-time update to frontend if socket is available
        if (this.io) {
          this.io.to(userId).emit('device_state_update', {
            deviceId: device._id,
            value: value,
            synchronized: device.currentState.synchronized,
            lastUpdated: device.currentState.lastUpdated,
            pendingCommand: device.currentState.pendingCommand
          });
        }
      }
    } catch (error) {
      console.error('Error updating device state:', error);
    }
  }

  publishMessage(userId, topic, message, options = {}) {
    const client = this.clients.get(userId);
    
    if (client && client.connected) {
      const publishOptions = {
        qos: options.qos || 1,
        retain: options.retain || false
      };
      
      client.publish(topic, message, publishOptions, (error) => {
        if (error) {
          console.error('Error publishing message:', error);
        } else {
          console.log(`Published to ${topic}: ${message}`);
        }
      });
      
      return true;
    } else {
      console.error(`No MQTT client found for user ${userId} or client not connected`);
      return false;
    }
  }

  disconnectUser(userId, isManual = false) {
    const client = this.clients.get(userId);
    if (client) {
      // Mark as manual disconnect to prevent auto-reconnect
      if (isManual && this.io) {
        // Find the socket for this user and emit manual disconnect
        const sockets = this.io.sockets.sockets;
        for (const [socketId, socket] of sockets) {
          if (socket.userId === userId) {
            socket.emit('mqtt_disconnected', { 
              status: 'disconnected', 
              message: 'Manually disconnected from MQTT broker',
              manual: true
            });
            break;
          }
        }
      }
      
      client.end();
      this.clients.delete(userId);
      console.log(`Disconnected MQTT client for user ${userId} ${isManual ? '(manual)' : '(automatic)'}`);
    }
  }

  isConnected(userId) {
    const client = this.clients.get(userId);
    return client && client.connected;
  }

  buildConnectionUrl(mqttConfig) {
    const protocol = mqttConfig.protocol || (mqttConfig.useSSL ? 'wss' : 'ws');
    const port = mqttConfig.port;
    
    if (protocol === 'ws' || protocol === 'wss') {
      return `${protocol}://${mqttConfig.host}:${port}${mqttConfig.path || '/mqtt'}`;
    } else {
      const mqttProtocol = mqttConfig.useSSL ? 'mqtts' : 'mqtt';
      return `${mqttProtocol}://${mqttConfig.host}:${port}`;
    }
  }

  buildConnectionOptions(mqttConfig) {
    // Ensure unique clientId by appending timestamp and random string
    const uniqueClientId = `${mqttConfig.clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    console.log('🔧 Generated unique clientId:', uniqueClientId);
    
    const options = {
      clientId: uniqueClientId,
      username: mqttConfig.username || undefined,
      password: mqttConfig.password || undefined,
      keepalive: mqttConfig.keepAlive || 60,
      connectTimeout: mqttConfig.connectTimeout || 10000,
      reconnectPeriod: 0, // Disable auto-reconnect at MQTT client level - handled by frontend
      clean: mqttConfig.cleanStart !== false,
      protocolVersion: mqttConfig.mqttVersion === '5.0' ? 5 : 4,
    };

    // MQTT 5.0 specific properties
    if (mqttConfig.mqttVersion === '5.0') {
      const properties = {};
      
      if (mqttConfig.sessionExpiryInterval !== undefined) {
        properties.sessionExpiryInterval = mqttConfig.sessionExpiryInterval;
      }
      if (mqttConfig.receiveMaximum !== undefined) {
        properties.receiveMaximum = mqttConfig.receiveMaximum;
      }
      if (mqttConfig.maximumPacketSize !== undefined) {
        properties.maximumPacketSize = mqttConfig.maximumPacketSize;
      }
      if (mqttConfig.topicAliasMaximum !== undefined) {
        properties.topicAliasMaximum = mqttConfig.topicAliasMaximum;
      }
      if (mqttConfig.requestResponseInfo !== undefined) {
        properties.requestResponseInfo = mqttConfig.requestResponseInfo;
      }
      if (mqttConfig.requestProblemInfo !== undefined) {
        properties.requestProblemInfo = mqttConfig.requestProblemInfo;
      }
      
      // User properties
      if (mqttConfig.userProperties && mqttConfig.userProperties.length > 0) {
        properties.userProperties = {};
        mqttConfig.userProperties.forEach(prop => {
          properties.userProperties[prop.key] = prop.value;
        });
      }
      
      if (Object.keys(properties).length > 0) {
        options.properties = properties;
      }
    }

    // Last Will and Testament
    if (mqttConfig.lastWillTopic) {
      options.will = {
        topic: mqttConfig.lastWillTopic,
        payload: mqttConfig.lastWillPayload || '',
        qos: mqttConfig.lastWillQos || 0,
        retain: mqttConfig.lastWillRetain || false
      };

      // MQTT 5.0 will properties
      if (mqttConfig.mqttVersion === '5.0') {
        const willProperties = {};
        
        if (mqttConfig.lastWillPayloadFormatIndicator !== undefined) {
          willProperties.payloadFormatIndicator = mqttConfig.lastWillPayloadFormatIndicator;
        }
        if (mqttConfig.lastWillDelayInterval !== undefined) {
          willProperties.willDelayInterval = mqttConfig.lastWillDelayInterval;
        }
        if (mqttConfig.lastWillMessageExpiryInterval !== undefined) {
          willProperties.messageExpiryInterval = mqttConfig.lastWillMessageExpiryInterval;
        }
        if (mqttConfig.lastWillContentType) {
          willProperties.contentType = mqttConfig.lastWillContentType;
        }
        if (mqttConfig.lastWillResponseTopic) {
          willProperties.responseTopic = mqttConfig.lastWillResponseTopic;
        }
        if (mqttConfig.lastWillCorrelationData) {
          willProperties.correlationData = Buffer.from(mqttConfig.lastWillCorrelationData);
        }
        
        if (Object.keys(willProperties).length > 0) {
          options.will.properties = willProperties;
        }
      }
    }

    return options;
  }
}

module.exports = new MqttService();
