/*
  ESP32 MQTT LED Control
  
  Hardware Requirements:
  - ESP32 Development Board
  - 2 LEDs connected to GPIO 22 and 23
  - Resistors (220-330 ohm) for LED current limiting
  
  Circuit:
  - LED 1: GPIO 22 -> 220Ω Resistor -> LED -> GND
  - LED 2: GPIO 23 -> 220Ω Resistor -> LED -> GND
  
  MQTT Topics:
  - Subscribe: /esp32/led/gpio22, /esp32/led/gpio23, /esp32/status
  - Publish: /esp32/response, /esp32/status
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker settings
const char* mqtt_server = "mqtt.eclipseprojects.io";
const int mqtt_port = 1883;
const char* mqtt_clientId = "ESP32_navincase01";

// GPIO pins for LEDs
const int LED_GPIO22 = 22;
const int LED_GPIO23 = 23;

// MQTT Topics
const char* TOPIC_LED_GPIO22 = "/esp32/led/gpio22";
const char* TOPIC_LED_GPIO23 = "/esp32/led/gpio23";
const char* TOPIC_STATUS = "/esp32/status";
const char* TOPIC_RESPONSE = "/esp32/response";
const char* TOPIC_QOS0 = "/topic/qos0";
const char* TOPIC_QOS1 = "/topic/qos1";

// LED states
bool led22_state = false;
bool led23_state = false;

// Timing
unsigned long lastHeartbeat = 0;
const unsigned long heartbeatInterval = 30000; // 30 seconds

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Initialize GPIO pins
  pinMode(LED_GPIO22, OUTPUT);
  pinMode(LED_GPIO23, OUTPUT);
  digitalWrite(LED_GPIO22, LOW);
  digitalWrite(LED_GPIO23, LOW);
  
  // Start with LED test
  testLEDs();
  
  // Connect to WiFi
  setupWiFi();
  
  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  
  // Connect to MQTT
  connectToMQTT();
  
  Serial.println("ESP32 MQTT LED Control Ready!");
  publishStatus();
}

void loop() {
  if (!client.connected()) {
    connectToMQTT();
  }
  client.loop();
  
  // Send heartbeat every 30 seconds
  if (millis() - lastHeartbeat > heartbeatInterval) {
    publishStatus();
    lastHeartbeat = millis();
  }
  
  delay(100);
}

void setupWiFi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  randomSeed(micros());
  
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void connectToMQTT() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    if (client.connect(mqtt_clientId)) {
      Serial.println("connected");
      
      // Subscribe to topics
      client.subscribe(TOPIC_LED_GPIO22, 1);
      client.subscribe(TOPIC_LED_GPIO23, 1);
      client.subscribe(TOPIC_STATUS, 1);
      client.subscribe(TOPIC_QOS0, 0);
      client.subscribe(TOPIC_QOS1, 1);
      
      Serial.println("Subscribed to MQTT topics");
      
      // Publish initial status
      publishStatus();
      
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  Serial.println(message);
  
  // Handle LED GPIO 22 control
  if (String(topic) == TOPIC_LED_GPIO22) {
    handleLEDControl(22, message);
  }
  // Handle LED GPIO 23 control
  else if (String(topic) == TOPIC_LED_GPIO23) {
    handleLEDControl(23, message);
  }
  // Handle status request
  else if (String(topic) == TOPIC_STATUS) {
    if (message == "STATUS" || message == "PING") {
      publishStatus();
    }
  }
  // Handle QoS topics (for testing)
  else if (String(topic) == TOPIC_QOS0 || String(topic) == TOPIC_QOS1) {
    handleTestMessage(topic, message);
  }
}

void handleLEDControl(int gpio, String command) {
  bool newState = false;
  
  if (command == "ON" || command == "1" || command == "true") {
    newState = true;
  } else if (command == "OFF" || command == "0" || command == "false") {
    newState = false;
  } else {
    Serial.println("Invalid LED command: " + command);
    return;
  }
  
  // Update LED state
  if (gpio == 22) {
    led22_state = newState;
    digitalWrite(LED_GPIO22, newState ? HIGH : LOW);
  } else if (gpio == 23) {
    led23_state = newState;
    digitalWrite(LED_GPIO23, newState ? HIGH : LOW);
  }
  
  // Publish response
  publishLEDResponse(gpio, newState);
  
  // Update status
  publishStatus();
  
  Serial.print("LED GPIO");
  Serial.print(gpio);
  Serial.print(" set to ");
  Serial.println(newState ? "ON" : "OFF");
}

void publishLEDResponse(int gpio, bool state) {
  StaticJsonDocument<200> doc;
  doc["gpio"] = gpio;
  doc["status"] = state ? "ON" : "OFF";
  doc["timestamp"] = millis();
  doc["device"] = "ESP32";
  
  String response;
  serializeJson(doc, response);
  
  client.publish(TOPIC_RESPONSE, response.c_str(), true);
}

void publishStatus() {
  StaticJsonDocument<300> doc;
  doc["device"] = "ESP32";
  doc["clientId"] = mqtt_clientId;
  doc["connected"] = true;
  doc["timestamp"] = millis();
  doc["uptime"] = millis();
  doc["wifi"]["ssid"] = WiFi.SSID();
  doc["wifi"]["ip"] = WiFi.localIP().toString();
  doc["wifi"]["rssi"] = WiFi.RSSI();
  doc["leds"]["gpio22"] = led22_state;
  doc["leds"]["gpio23"] = led23_state;
  doc["memory"]["free"] = ESP.getFreeHeap();
  doc["memory"]["total"] = ESP.getHeapSize();
  
  String status;
  serializeJson(doc, status);
  
  client.publish(TOPIC_STATUS, status.c_str(), true);
  
  Serial.println("Status published");
}

void handleTestMessage(char* topic, String message) {
  Serial.print("Test message on ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(message);
  
  // Echo back the message with timestamp
  StaticJsonDocument<200> doc;
  doc["topic"] = topic;
  doc["original_message"] = message;
  doc["timestamp"] = millis();
  doc["device"] = "ESP32";
  doc["echo"] = true;
  
  String response;
  serializeJson(doc, response);
  
  client.publish(TOPIC_RESPONSE, response.c_str());
}

void testLEDs() {
  Serial.println("Testing LEDs...");
  
  // Test sequence
  digitalWrite(LED_GPIO22, HIGH);
  delay(500);
  digitalWrite(LED_GPIO22, LOW);
  delay(500);
  
  digitalWrite(LED_GPIO23, HIGH);
  delay(500);
  digitalWrite(LED_GPIO23, LOW);
  delay(500);
  
  // Both on
  digitalWrite(LED_GPIO22, HIGH);
  digitalWrite(LED_GPIO23, HIGH);
  delay(1000);
  
  // Both off
  digitalWrite(LED_GPIO22, LOW);
  digitalWrite(LED_GPIO23, LOW);
  
  Serial.println("LED test complete");
}
