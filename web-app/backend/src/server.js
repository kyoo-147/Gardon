const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mqtt = require('mqtt');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MQTT client
let mqttClient = null;
let mqttConfig = null;

// ESP32 status
let esp32Status = {
  connected: false,
  leds: {
    gpio22: false,
    gpio23: false
  },
  lastUpdate: Date.now()
};

// Default topics
const DEFAULT_TOPICS = {
  QOS0: '/topic/qos0',
  QOS1: '/topic/qos1',
  LED_GPIO22: '/esp32/led/gpio22',
  LED_GPIO23: '/esp32/led/gpio23',
  STATUS: '/esp32/status',
  RESPONSE: '/esp32/response'
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current status to new client
  socket.emit('esp32Status', esp32Status);
  socket.emit('mqttStatus', {
    connected: mqttClient && mqttClient.connected,
    config: mqttConfig
  });

  // MQTT Connection
  socket.on('connectMQTT', (config) => {
    console.log('Connecting to MQTT broker:', config);
    mqttConfig = config;
    
    if (mqttClient) {
      mqttClient.end();
    }

    const options = {
      clientId: config.clientId,
      username: config.username,
      password: config.password,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
    };

    const brokerUrl = `${config.protocol}://${config.host}:${config.port}`;
    mqttClient = mqtt.connect(brokerUrl, options);

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');
      socket.emit('mqttConnected', true);
      io.emit('mqttStatus', { connected: true, config: mqttConfig });

      // Subscribe to default topics
      const topicsToSubscribe = [
        DEFAULT_TOPICS.QOS0,
        DEFAULT_TOPICS.QOS1,
        DEFAULT_TOPICS.STATUS,
        DEFAULT_TOPICS.RESPONSE
      ];

      topicsToSubscribe.forEach(topic => {
        mqttClient.subscribe(topic, { qos: topic.includes('qos1') ? 1 : 0 }, (err) => {
          if (!err) {
            console.log(`Subscribed to ${topic}`);
            socket.emit('topicSubscribed', { topic, subscribed: true });
          }
        });
      });
    });

    mqttClient.on('error', (error) => {
      console.error('MQTT Error:', error);
      socket.emit('mqttError', error.message);
    });

    mqttClient.on('close', () => {
      console.log('MQTT connection closed');
      socket.emit('mqttConnected', false);
      io.emit('mqttStatus', { connected: false, config: mqttConfig });
    });

    mqttClient.on('message', (topic, message) => {
      const payload = message.toString();
      console.log(`Received message on ${topic}: ${payload}`);

      const mqttMessage = {
        topic,
        payload,
        qos: 0,
        timestamp: Date.now()
      };

      // Broadcast message to all clients
      io.emit('mqttMessage', mqttMessage);

      // Handle ESP32 status updates
      if (topic === DEFAULT_TOPICS.STATUS) {
        try {
          const status = JSON.parse(payload);
          esp32Status = {
            ...esp32Status,
            connected: true,
            leds: status.leds || esp32Status.leds,
            lastUpdate: Date.now()
          };
          io.emit('esp32Status', esp32Status);
        } catch (e) {
          console.error('Error parsing ESP32 status:', e);
        }
      }

      // Handle LED responses
      if (topic === DEFAULT_TOPICS.RESPONSE) {
        try {
          const response = JSON.parse(payload);
          if (response.gpio && response.status !== undefined) {
            esp32Status.leds[`gpio${response.gpio}`] = response.status === 'ON';
            esp32Status.lastUpdate = Date.now();
            io.emit('esp32Status', esp32Status);
          }
        } catch (e) {
          console.error('Error parsing LED response:', e);
        }
      }
    });
  });

  // MQTT Disconnect
  socket.on('disconnectMQTT', () => {
    if (mqttClient) {
      mqttClient.end();
      mqttClient = null;
      mqttConfig = null;
      socket.emit('mqttConnected', false);
      io.emit('mqttStatus', { connected: false, config: null });
    }
  });

  // Publish message
  socket.on('publishMessage', (data) => {
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(data.topic, data.payload, { qos: data.qos || 0 }, (err) => {
        if (!err) {
          console.log(`Published to ${data.topic}: ${data.payload}`);
          socket.emit('messagePublished', { success: true, ...data });
        } else {
          console.error('Publish error:', err);
          socket.emit('messagePublished', { success: false, error: err.message });
        }
      });
    } else {
      socket.emit('messagePublished', { success: false, error: 'MQTT not connected' });
    }
  });

  // Subscribe to topic
  socket.on('subscribeTopic', (data) => {
    if (mqttClient && mqttClient.connected) {
      mqttClient.subscribe(data.topic, { qos: data.qos || 0 }, (err) => {
        if (!err) {
          console.log(`Subscribed to ${data.topic}`);
          socket.emit('topicSubscribed', { topic: data.topic, subscribed: true });
        } else {
          console.error('Subscribe error:', err);
          socket.emit('topicSubscribed', { topic: data.topic, subscribed: false, error: err.message });
        }
      });
    }
  });

  // Unsubscribe from topic
  socket.on('unsubscribeTopic', (topic) => {
    if (mqttClient && mqttClient.connected) {
      mqttClient.unsubscribe(topic, (err) => {
        if (!err) {
          console.log(`Unsubscribed from ${topic}`);
          socket.emit('topicSubscribed', { topic, subscribed: false });
        }
      });
    }
  });

  // LED Control
  socket.on('controlLED', (data) => {
    if (mqttClient && mqttClient.connected) {
      const topic = data.gpio === 22 ? DEFAULT_TOPICS.LED_GPIO22 : DEFAULT_TOPICS.LED_GPIO23;
      const command = data.state ? 'ON' : 'OFF';
      
      mqttClient.publish(topic, command, { qos: 1 }, (err) => {
        if (!err) {
          console.log(`LED Control - GPIO${data.gpio}: ${command}`);
          socket.emit('ledControlResult', { success: true, gpio: data.gpio, state: data.state });
        } else {
          console.error('LED Control error:', err);
          socket.emit('ledControlResult', { success: false, error: err.message });
        }
      });
    } else {
      socket.emit('ledControlResult', { success: false, error: 'MQTT not connected' });
    }
  });

  // Request ESP32 status
  socket.on('requestESP32Status', () => {
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(DEFAULT_TOPICS.STATUS, 'STATUS', { qos: 1 });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mqtt: mqttClient ? mqttClient.connected : false,
    timestamp: new Date().toISOString()
  });
});

// Get current status
app.get('/api/status', (req, res) => {
  res.json({
    mqtt: {
      connected: mqttClient ? mqttClient.connected : false,
      config: mqttConfig
    },
    esp32: esp32Status
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  if (mqttClient) {
    mqttClient.end();
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
