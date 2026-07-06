import io from 'socket.io-client';
import { SOCKET_URL } from '../constants';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect(token = null) {
    if (this.socket) {
      this.disconnect();
    }

    const options = {
      transports: ['websocket'],
      upgrade: false,
    };

    if (token) {
      options.auth = { token };
    }

    this.socket = io(SOCKET_URL, options);

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.isConnected = true;
      this.emit('socket_connected', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.emit('socket_disconnected', { status: 'disconnected', reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.emit('socket_error', { error: error.message });
    });

    // MQTT event listeners
    this.socket.on('mqtt_connected', (data) => {
      this.emit('mqtt_connected', data);
    });

    this.socket.on('mqtt_disconnected', (data) => {
      this.emit('mqtt_disconnected', data);
    });

    this.socket.on('mqtt_reconnecting', (data) => {
      this.emit('mqtt_reconnecting', data);
    });

    this.socket.on('mqtt_error', (data) => {
      this.emit('mqtt_error', data);
    });

    this.socket.on('mqtt_message', (data) => {
      this.emit('mqtt_message', data);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Connect to MQTT broker
  connectToMqtt(userId, mqttConfig) {
    if (this.socket && this.isConnected) {
      this.socket.emit('connect_mqtt', {
        userId,
        mqttConfig
      });
    } else {
      console.error('Socket not connected');
    }
  }

  // Disconnect from MQTT broker
  disconnectMqtt(userId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('disconnect_mqtt', {
        userId
      });
    } else {
      console.error('Socket not connected');
    }
  }

  // Send device command
  sendDeviceCommand(topic, message) {
    if (this.socket && this.isConnected) {
      this.socket.emit('device_command', {
        topic,
        message
      });
    } else {
      console.error('Socket not connected');
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in socket event callback:', error);
        }
      });
    }
  }

  // Clean up all listeners
  removeAllListeners() {
    this.listeners.clear();
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  getSocketId() {
    return this.socket?.id || null;
  }
}

export default new SocketService();
