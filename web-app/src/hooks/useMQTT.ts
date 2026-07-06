import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  MQTTConfig, 
  MQTTMessage, 
  ESP32Status, 
  ConnectionStatus, 
  DEFAULT_MQTT_CONFIG 
} from '../types/mqtt';

interface UseMQTTReturn {
  // Connection states
  connectionStatus: ConnectionStatus;
  esp32Status: ESP32Status;
  messages: MQTTMessage[];
  
  // Connection functions
  connect: (config: MQTTConfig) => void;
  disconnect: () => void;
  
  // Message functions
  publishMessage: (topic: string, payload: string, qos?: 0 | 1 | 2) => void;
  subscribeTopic: (topic: string, qos?: 0 | 1 | 2) => void;
  unsubscribeTopic: (topic: string) => void;
  
  // LED control
  controlLED: (gpio: 22 | 23, state: boolean) => void;
  requestESP32Status: () => void;
  
  // Utility
  clearMessages: () => void;
}

export const useMQTT = (serverUrl: string = 'http://localhost:3001'): UseMQTTReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    mqtt: false,
    esp32: false
  });
  const [esp32Status, setESP32Status] = useState<ESP32Status>({
    connected: false,
    leds: { gpio22: false, gpio23: false },
    lastUpdate: Date.now()
  });
  const [messages, setMessages] = useState<MQTTMessage[]>([]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus(prev => ({ ...prev, mqtt: false }));
    });

    newSocket.on('mqttConnected', (connected: boolean) => {
      setConnectionStatus(prev => ({ ...prev, mqtt: connected }));
    });

    newSocket.on('mqttStatus', (status: { connected: boolean; config: MQTTConfig | null }) => {
      setConnectionStatus(prev => ({ ...prev, mqtt: status.connected }));
    });

    newSocket.on('esp32Status', (status: ESP32Status) => {
      setESP32Status(status);
      setConnectionStatus(prev => ({ ...prev, esp32: status.connected }));
    });

    newSocket.on('mqttMessage', (message: MQTTMessage) => {
      setMessages(prev => [...prev, message].slice(-100)); // Keep last 100 messages
    });

    newSocket.on('mqttError', (error: string) => {
      console.error('MQTT Error:', error);
    });

    newSocket.on('topicSubscribed', (data: { topic: string; subscribed: boolean; error?: string }) => {
      if (data.error) {
        console.error(`Subscription error for ${data.topic}:`, data.error);
      } else {
        console.log(`Topic ${data.topic} subscription:`, data.subscribed);
      }
    });

    newSocket.on('messagePublished', (result: { success: boolean; error?: string }) => {
      if (!result.success) {
        console.error('Publish error:', result.error);
      }
    });

    newSocket.on('ledControlResult', (result: { success: boolean; gpio?: number; state?: boolean; error?: string }) => {
      if (!result.success) {
        console.error('LED control error:', result.error);
      } else {
        console.log(`LED GPIO${result.gpio} controlled:`, result.state ? 'ON' : 'OFF');
      }
    });

    return () => {
      newSocket.close();
    };
  }, [serverUrl]);

  // Connect to MQTT broker
  const connect = useCallback((config: MQTTConfig) => {
    if (socket) {
      socket.emit('connectMQTT', config);
    }
  }, [socket]);

  // Disconnect from MQTT broker
  const disconnect = useCallback(() => {
    if (socket) {
      socket.emit('disconnectMQTT');
    }
  }, [socket]);

  // Publish message
  const publishMessage = useCallback((topic: string, payload: string, qos: 0 | 1 | 2 = 0) => {
    if (socket) {
      socket.emit('publishMessage', { topic, payload, qos });
    }
  }, [socket]);

  // Subscribe to topic
  const subscribeTopic = useCallback((topic: string, qos: 0 | 1 | 2 = 0) => {
    if (socket) {
      socket.emit('subscribeTopic', { topic, qos });
    }
  }, [socket]);

  // Unsubscribe from topic
  const unsubscribeTopic = useCallback((topic: string) => {
    if (socket) {
      socket.emit('unsubscribeTopic', topic);
    }
  }, [socket]);

  // Control LED
  const controlLED = useCallback((gpio: 22 | 23, state: boolean) => {
    if (socket) {
      socket.emit('controlLED', { gpio, state });
    }
  }, [socket]);

  // Request ESP32 status
  const requestESP32Status = useCallback(() => {
    if (socket) {
      socket.emit('requestESP32Status');
    }
  }, [socket]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    connectionStatus,
    esp32Status,
    messages,
    connect,
    disconnect,
    publishMessage,
    subscribeTopic,
    unsubscribeTopic,
    controlLED,
    requestESP32Status,
    clearMessages
  };
};
