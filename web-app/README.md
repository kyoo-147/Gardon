# 🚀 ESP32 MQTT Control Center

Ứng dụng React.js với Node.js backend để điều khiển ESP32 qua MQTT. Hệ thống cho phép điều khiển LED từ xa, giám sát trạng thái thiết bị và quản lý MQTT topics một cách chuyên nghiệp.

## ✨ Tính năng chính

### 🔧 MQTT Configuration
- Kết nối MQTT qua WebSocket
- Cấu hình broker (URL, port, credentials)
- Lưu cấu hình tự động
- Kết nối/ngắt kết nối dễ dàng

### 💡 LED Control
- Điều khiển 2 LED (GPIO 22 và 23)
- Bật/tắt từng LED riêng biệt
- Quick actions (All ON/OFF, Toggle)
- Hiển thị trạng thái real-time

### 📡 MQTT Topics
- Subscribe/Unsubscribe topics
- Publish messages với QoS
- Theo dõi messages real-time
- Quick test commands

## 🏗️ Cấu trúc Project

```
├── src/                    # React Frontend
│   ├── components/         # React Components
│   │   ├── MQTTConfig.tsx     # MQTT Configuration
│   │   ├── LEDControl.tsx     # LED Control Panel
│   │   └── MQTTTopics.tsx     # Topics & Messages
│   ├── hooks/             # Custom Hooks
│   │   └── useMQTT.ts         # MQTT Connection Hook
│   ├── types/             # TypeScript Types
│   │   └── mqtt.ts            # MQTT Interfaces
│   └── App.tsx            # Main Application
├── backend/               # Node.js Backend
│   ├── src/
│   │   └── server.js          # Express + Socket.IO Server
│   └── config/
│       └── default.json       # Configuration
└── esp32/                 # ESP32 Code
    └── esp32_mqtt_led_control.ino
```

## 🚀 Cài đặt và Chạy

### 1. Frontend (React)
```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev
```

### 2. Backend (Node.js)
```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev
```

### 3. ESP32 Setup

#### Hardware Requirements:
- ESP32 Development Board
- 2 LEDs
- 2 Resistors (220-330Ω)
- Breadboard và dây nối

#### Circuit Diagram:
```
ESP32 GPIO 22 -> 220Ω Resistor -> LED 1 -> GND
ESP32 GPIO 23 -> 220Ω Resistor -> LED 2 -> GND
```

#### Arduino Libraries cần thiết:
```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
```

#### Cài đặt Libraries:
1. Mở Arduino IDE
2. Tools -> Manage Libraries
3. Tìm và cài đặt:
   - `PubSubClient` by Nick O'Leary
   - `ArduinoJson` by Benoit Blanchon

## ⚙️ Cấu hình

### MQTT Broker mặc định:
- **Host:** mqtt.eclipseprojects.io
- **Port:** 1883
- **Client ID:** navincase01
- **Protocol:** MQTT

### MQTT Topics:
- `/topic/qos0` - QoS 0 testing
- `/topic/qos1` - QoS 1 testing
- `/esp32/led/gpio22` - LED 1 control
- `/esp32/led/gpio23` - LED 2 control
- `/esp32/status` - ESP32 status
- `/esp32/response` - ESP32 responses

## 🎮 Cách sử dụng

### 1. Khởi động Backend
```bash
cd backend
npm run dev
```
Server sẽ chạy tại `http://localhost:3001`

### 2. Khởi động Frontend
```bash
npm run dev
```
Web app sẽ chạy tại `http://localhost:5173`

### 3. Cấu hình ESP32
1. Cập nhật WiFi credentials trong ESP32 code:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

2. Upload code lên ESP32

### 4. Kết nối và Điều khiển
1. Mở web app
2. Tab "Configuration" -> Connect to MQTT
3. Tab "LED Control" -> Điều khiển LEDs
4. Tab "MQTT Topics" -> Theo dõi messages

## 📱 Giao diện Web App

### 🔧 Configuration Tab
- Cấu hình MQTT broker
- Username/Password (optional)
- Connect/Disconnect buttons
- Connection status indicators

### 💡 LED Control Tab
- Visual LED indicators
- Individual LED controls
- Quick action buttons
- ESP32 connection status

### 📡 MQTT Topics Tab
- Subscribe to topics
- Publish messages
- Message history
- Quick test commands

## 🔧 API Endpoints

### Backend REST API:
- `GET /health` - Health check
- `GET /api/status` - System status

### WebSocket Events:
- `connectMQTT` - Connect to broker
- `disconnectMQTT` - Disconnect from broker
- `publishMessage` - Publish message
- `subscribeTopic` - Subscribe to topic
- `controlLED` - Control LED

## 🛠️ Troubleshooting

### Kết nối MQTT thất bại:
1. Kiểm tra network connection
2. Verify broker URL và port
3. Thử với broker khác

### ESP32 không kết nối:
1. Kiểm tra WiFi credentials
2. Verify MQTT broker settings
3. Check Serial Monitor cho logs

### LED không hoạt động:
1. Kiểm tra circuit connections
2. Verify GPIO pin assignments
3. Test với LED khác

## 📦 Dependencies

### Frontend:
- React 18
- TypeScript
- Socket.IO Client
- Vite

### Backend:
- Node.js
- Express
- Socket.IO
- MQTT.js
- CORS

### ESP32:
- WiFi Library
- PubSubClient
- ArduinoJson

## 🔒 Security Notes

- MQTT broker public (test only)
- Trong production: sử dụng MQTTS
- Implement authentication
- Use secure WiFi networks

## 🚀 Future Enhancements

- [ ] Sensor data monitoring
- [ ] Multiple ESP32 support
- [ ] Data logging & analytics
- [ ] Mobile app
- [ ] Voice control integration
- [ ] Scheduling & automation

## 🤝 Contributing

1. Fork the project
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file

## 📞 Support

Có vấn đề? Tạo Issue trong GitHub repository này.

---

**Made with ❤️ for IoT enthusiasts**

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
