const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config({ path: __dirname + '/.env' });

// Test Ollama URL loading
console.log('🔧 Environment Variables Check:');
console.log('OLLAMA_BASE_URL:', process.env.OLLAMA_BASE_URL);
console.log('OLLAMA_MODEL:', process.env.OLLAMA_MODEL);
console.log('ACCESS_TOKEN:', process.env.ACCESS_TOKEN);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'development' ? "*" : process.env.CORS_ORIGIN?.split(',') || ["*"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',');
    if (allowedOrigins.includes('*') || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request logging middleware in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/mqtt-config', require('./routes/mqttConfig'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/social', require('./routes/social'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/mqtt-requests', require('./routes/mqttRequests'));

// Use social routes for users and friends endpoints
app.use('/api/users', require('./routes/social'));
app.use('/api/friends', require('./routes/social'));
app.use('/api/smart-detection', require('./routes/devices')); // Redirect to devices for smart detection

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'MQTT IoT Dashboard Backend'
  });
});

// Initialize services
const mqttService = require('./services/mqttService');
mqttService.initialize(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Handle MQTT connection requests
  socket.on('connect_mqtt', (config) => {
    mqttService.connectToMqtt(config, socket);
  });

  // Handle MQTT disconnection requests
  socket.on('disconnect_mqtt', (data) => {
    const { userId } = data || {};
    if (userId) {
      mqttService.disconnectUser(userId, true); // true = manual disconnect
    }
  });

  // Handle device control commands
  socket.on('device_command', (data) => {
    mqttService.publishMessage(data.topic, data.message);
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
  
  // Get local IP address for development
  if (process.env.NODE_ENV === 'development') {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    console.log('\nAvailable network interfaces:');
    Object.keys(networkInterfaces).forEach((interfaceName) => {
      const interfaces = networkInterfaces[interfaceName];
      interfaces.forEach((interface) => {
        if (interface.family === 'IPv4' && !interface.internal) {
          console.log(`  ${interfaceName}: http://${interface.address}:${PORT}`);
        }
      });
    });
    console.log(`  Android Emulator: http://10.0.2.2:${PORT}`);
    console.log(`  iOS Simulator: http://localhost:${PORT}`);
  }
});

module.exports = app;
