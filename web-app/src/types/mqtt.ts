export interface MQTTConfig {
  clientId: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'mqtt' | 'mqtts' | 'ws' | 'wss';
}

export interface MQTTMessage {
  topic: string;
  payload: string;
  qos: 0 | 1 | 2;
  timestamp: number;
}

export interface LEDStatus {
  gpio22: boolean; // LED 1
  gpio23: boolean; // LED 2
}

export interface ESP32Status {
  connected: boolean;
  leds: LEDStatus;
  lastUpdate: number;
}

export interface ConnectionStatus {
  mqtt: boolean;
  esp32: boolean;
}

export interface TopicSubscription {
  topic: string;
  qos: 0 | 1 | 2;
  subscribed: boolean;
}

// MQTT Commands cho ESP32
export enum MQTTCommand {
  LED_ON = 'ON',
  LED_OFF = 'OFF',
  STATUS_REQUEST = 'STATUS',
  PING = 'PING'
}

// Topics mặc định
export const DEFAULT_TOPICS = {
  QOS0: '/topic/qos0',
  QOS1: '/topic/qos1',
  LED_GPIO22: '/esp32/led/gpio22',
  LED_GPIO23: '/esp32/led/gpio23',
  STATUS: '/esp32/status',
  RESPONSE: '/esp32/response'
} as const;

// Cấu hình MQTT mặc định
export const DEFAULT_MQTT_CONFIG: MQTTConfig = {
  clientId: 'navincase01',
  host: 'mqtt.eclipseprojects.io',
  port: 1883,
  protocol: 'mqtt'
};