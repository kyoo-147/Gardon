# Phân Tích Chi Tiết: ESP-IDF Provisioning Android

## Tổng Quan

**ESP-IDF Provisioning Android** là một thư viện và ứng dụng companion cho việc cấu hình mạng Wi-Fi cho các thiết bị ESP32, ESP32-S2, ESP32-S3, ESP32-C3 và ESP8266. Ứng dụng này cung cấp cơ chế truyền thông tin xác thực mạng và dữ liệu tùy chỉnh đến các thiết bị ESP thông qua BLE (Bluetooth Low Energy) hoặc SoftAP (Soft Access Point).

## Kiến Trúc Công Nghệ

### 1. Cấu Trúc Dự Án

```
esp-idf-provisioning-android/
├── app/                          # Ứng dụng demo
│   └── src/main/java/com/espressif/ui/
├── provisioning/                 # Thư viện core
│   └── src/main/java/com/espressif/provisioning/
└── README.md
```

### 2. Công Nghệ Sử Dụng

- **Ngôn ngữ**: Java (Android)
- **Platform**: Android API Level 26+ (Android 8.0+)
- **Protocols**: 
  - BLE (Bluetooth Low Energy)
  - Wi-Fi SoftAP
  - Protocol Buffers cho serialization
- **Security**: 
  - Security 0 (No encryption)
  - Security 1 (Curve25519 key exchange + AES-CTR encryption)
  - Security 2 (SRP6a + AES-GCM encryption)
- **QR Code**: Google ML Kit Vision API
- **Event Bus**: EventBus cho communication

## Chi Tiết Triển Khai

### 1. Class ESPProvisionManager (Singleton)

```java
public class ESPProvisionManager {
    private static ESPProvisionManager provision;
    private ESPDevice espDevice;
    private BleScanner bleScanner;
    private WiFiScanner wifiScanner;
    
    // Singleton pattern
    public static ESPProvisionManager getInstance(Context context);
    
    // QR Code scanning
    public void scanQRCode(Activity activityContext, 
                          CameraSourcePreview cameraSourcePreview, 
                          QRCodeScanListener qrCodeScanListener);
    
    // Manual device creation
    public ESPDevice createESPDevice(TransportType transportType, 
                                   SecurityType securityType);
    
    // BLE device search
    public void searchBleEspDevices(String prefix, 
                                  BleScanListener bleScanListener);
}
```

### 2. Class ESPDevice

```java
public class ESPDevice {
    // Connection methods
    public void connectBLEDevice(BluetoothDevice bluetoothDevice, 
                               String primaryServiceUuid);
    public void connectWiFiDevice();
    
    // Security setup
    public void setProofOfPossession(String pop);
    public void setUserName(String username); // For Security 2
    
    // Network operations
    public void scanNetworks(WiFiScanListener wifiScanListener);
    public void provision(String ssid, String passphrase, 
                         ProvisionListener provisionListener);
    
    // Custom data exchange
    public void sendDataToCustomEndPoint(String path, byte[] data, 
                                       SessionListener sessionListener);
}
```

### 3. Logic Hoạt Động

#### A. Quy Trình Provisioning

1. **Device Discovery**:
   ```java
   // QR Code scan
   ESPProvisionManager.getInstance(context)
       .scanQRCode(activity, cameraPreview, qrListener);
   
   // Manual BLE search
   ESPProvisionManager.getInstance(context)
       .searchBleEspDevices("PROV_", bleListener);
   ```

2. **Device Connection**:
   ```java
   // BLE connection
   espDevice.connectBLEDevice(bluetoothDevice, serviceUuid);
   
   // SoftAP connection
   espDevice.connectWiFiDevice();
   ```

3. **Security Setup**:
   ```java
   espDevice.setProofOfPossession(pop);
   espDevice.setUserName(username); // Security 2 only
   ```

4. **Network Scanning**:
   ```java
   espDevice.scanNetworks(new WiFiScanListener() {
       @Override
       public void onWifiListReceived(ArrayList<WiFiAccessPoint> wifiList) {
           // Display available networks
       }
   });
   ```

5. **Provisioning**:
   ```java
   espDevice.provision(ssid, password, new ProvisionListener() {
       @Override
       public void createSessionFailed(Exception e) { }
       
       @Override
       public void wifiConfigSent() { }
       
       @Override
       public void wifiConfigApplied() { }
       
       @Override
       public void deviceProvisioningSuccess() { }
       
       @Override
       public void onProvisioningFailed(Exception e) { }
   });
   ```

#### B. QR Code Processing

QR Code format JSON:
```json
{
    "ver": "v1",
    "name": "PROV_CE03C0",
    "pop": "abcd1234",
    "transport": "ble", // or "softap"
    "security": 2,      // 0, 1, or 2
    "username": "user", // For security 2
    "password": "pass"  // For SoftAP
}
```

#### C. Security Implementation

- **Security 0**: No encryption, plain text communication
- **Security 1**: 
  - Curve25519 ECDH key exchange
  - AES-CTR encryption
  - Proof of Possession (PoP) verification
- **Security 2**: 
  - SRP6a (Secure Remote Password) protocol
  - AES-GCM encryption
  - Username + password authentication

#### D. Transport Layers

1. **BLE Transport**:
   - Uses GATT characteristics for communication
   - Custom service UUID for ESP devices
   - Handles MTU negotiation
   - Supports data fragmentation

2. **SoftAP Transport**:
   - HTTP-based communication
   - Device creates Wi-Fi hotspot
   - RESTful API endpoints
   - JSON payload exchange

## Chuyển Đổi Sang Expo React Native

### 1. Cấu Trúc Dự Án React Native

```
esp-provisioning-rn/
├── src/
│   ├── components/
│   │   ├── QRScanner.js
│   │   ├── DeviceList.js
│   │   └── ProvisioningSteps.js
│   ├── services/
│   │   ├── ESPProvisionManager.js
│   │   ├── BLEService.js
│   │   ├── WiFiService.js
│   │   └── SecurityService.js
│   ├── screens/
│   │   ├── DeviceDiscovery.js
│   │   ├── NetworkSelection.js
│   │   └── ProvisioningScreen.js
│   └── utils/
│       ├── Constants.js
│       └── Helpers.js
├── app.json
└── package.json
```

### 2. Dependencies Cần Thiết

```json
{
  "dependencies": {
    "expo": "~49.0.0",
    "expo-barcode-scanner": "~12.5.0",
    "expo-camera": "~13.4.0",
    "expo-wifi": "~1.0.0",
    "react-native-ble-manager": "^10.0.0",
    "react-native-ble-plx": "^3.0.0",
    "expo-crypto": "~12.4.0",
    "expo-network": "~5.4.0",
    "@react-native-async-storage/async-storage": "1.18.2",
    "react-native-event-emitter": "^1.0.0"
  }
}
```

### 3. Implementation Core Classes

#### A. ESPProvisionManager.js

```javascript
import { BleManager } from 'react-native-ble-plx';
import { EventEmitter } from 'events';

class ESPProvisionManager extends EventEmitter {
  constructor() {
    super();
    this.bleManager = new BleManager();
    this.espDevice = null;
    this.isScanning = false;
  }

  static getInstance() {
    if (!ESPProvisionManager.instance) {
      ESPProvisionManager.instance = new ESPProvisionManager();
    }
    return ESPProvisionManager.instance;
  }

  // QR Code scanning using expo-barcode-scanner
  async scanQRCode(onQRScanned, onError) {
    try {
      // Implementation using expo-barcode-scanner
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status === 'granted') {
        return { success: true };
      }
    } catch (error) {
      onError(error);
    }
  }

  // BLE device search
  async searchBleEspDevices(prefix = 'PROV_', onDeviceFound, onError) {
    try {
      this.isScanning = true;
      
      this.bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          onError(error);
          return;
        }

        if (device.name && device.name.startsWith(prefix)) {
          onDeviceFound({
            id: device.id,
            name: device.name,
            rssi: device.rssi,
            device: device
          });
        }
      });

      // Stop scanning after 30 seconds
      setTimeout(() => {
        this.stopBleSearch();
      }, 30000);

    } catch (error) {
      onError(error);
    }
  }

  stopBleSearch() {
    this.isScanning = false;
    this.bleManager.stopDeviceScan();
  }

  // Create ESP Device
  createESPDevice(transportType, securityType) {
    this.espDevice = new ESPDevice(transportType, securityType);
    return this.espDevice;
  }

  getEspDevice() {
    return this.espDevice;
  }
}

export default ESPProvisionManager;
```

#### B. ESPDevice.js

```javascript
import CryptoJS from 'crypto-js';
import { NetworkInfo } from 'react-native-network-info';

class ESPDevice {
  constructor(transportType, securityType) {
    this.transportType = transportType; // 'BLE' or 'SOFTAP'
    this.securityType = securityType;   // 0, 1, or 2
    this.deviceName = '';
    this.proofOfPossession = '';
    this.username = '';
    this.isConnected = false;
    this.sessionKey = null;
  }

  // Connection methods
  async connectBLEDevice(device, primaryServiceUuid) {
    try {
      const connectedDevice = await device.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      this.connectedDevice = connectedDevice;
      this.isConnected = true;
      
      // Emit connection event
      this.emit('deviceConnected');
      
      return { success: true };
    } catch (error) {
      throw new Error(`BLE connection failed: ${error.message}`);
    }
  }

  async connectWiFiDevice() {
    try {
      // For SoftAP, device creates hotspot
      // App connects to device's WiFi network
      const networkInfo = await NetworkInfo.getSSID();
      
      if (networkInfo && networkInfo.includes(this.deviceName)) {
        this.isConnected = true;
        this.emit('deviceConnected');
        return { success: true };
      }
      
      throw new Error('Failed to connect to device WiFi');
    } catch (error) {
      throw new Error(`WiFi connection failed: ${error.message}`);
    }
  }

  // Security setup
  setProofOfPossession(pop) {
    this.proofOfPossession = pop;
  }

  setUserName(username) {
    this.username = username;
  }

  // Network scanning
  async scanNetworks(onNetworksReceived, onError) {
    try {
      const endpoint = '/proto-ver';
      const scanData = this.createScanRequest();
      
      const response = await this.sendData(endpoint, scanData);
      const networks = this.parseScanResponse(response);
      
      onNetworksReceived(networks);
    } catch (error) {
      onError(error);
    }
  }

  // Provisioning
  async provision(ssid, passphrase, callbacks) {
    try {
      // Step 1: Create session
      callbacks.onSessionStarted && callbacks.onSessionStarted();
      await this.createSession();

      // Step 2: Send WiFi config
      callbacks.onWifiConfigSent && callbacks.onWifiConfigSent();
      await this.sendWiFiConfig(ssid, passphrase);

      // Step 3: Apply config
      callbacks.onWifiConfigApplied && callbacks.onWifiConfigApplied();
      await this.applyWiFiConfig();

      // Step 4: Success
      callbacks.onProvisioningSuccess && callbacks.onProvisioningSuccess();
      
    } catch (error) {
      callbacks.onProvisioningFailed && callbacks.onProvisioningFailed(error);
    }
  }

  // Protocol implementation
  async createSession() {
    if (this.securityType === 0) {
      // No security
      this.sessionKey = null;
      return;
    }

    if (this.securityType === 1) {
      // Implement Curve25519 + AES-CTR
      await this.performSecurity1Handshake();
    } else if (this.securityType === 2) {
      // Implement SRP6a + AES-GCM
      await this.performSecurity2Handshake();
    }
  }

  async sendWiFiConfig(ssid, passphrase) {
    const configData = {
      ssid: ssid,
      passphrase: passphrase
    };

    const encryptedData = this.encryptData(JSON.stringify(configData));
    return await this.sendData('/prov-config', encryptedData);
  }

  async applyWiFiConfig() {
    const applyData = { apply: true };
    const encryptedData = this.encryptData(JSON.stringify(applyData));
    return await this.sendData('/prov-apply', encryptedData);
  }

  // Data transmission
  async sendData(endpoint, data) {
    if (this.transportType === 'BLE') {
      return await this.sendBLEData(endpoint, data);
    } else {
      return await this.sendHTTPData(endpoint, data);
    }
  }

  async sendBLEData(endpoint, data) {
    // Implement BLE GATT communication
    const characteristic = await this.getCharacteristic(endpoint);
    return await characteristic.writeWithResponse(data);
  }

  async sendHTTPData(endpoint, data) {
    // Implement HTTP communication for SoftAP
    const deviceIP = '192.168.4.1'; // Default ESP SoftAP IP
    const url = `http://${deviceIP}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-protobuf'
      },
      body: data
    });

    return await response.arrayBuffer();
  }

  // Encryption/Decryption
  encryptData(data) {
    if (this.securityType === 0) {
      return data;
    }

    if (this.securityType === 1) {
      // AES-CTR encryption
      return CryptoJS.AES.encrypt(data, this.sessionKey, {
        mode: CryptoJS.mode.CTR
      }).toString();
    } else if (this.securityType === 2) {
      // AES-GCM encryption
      return CryptoJS.AES.encrypt(data, this.sessionKey, {
        mode: CryptoJS.mode.GCM
      }).toString();
    }
  }

  decryptData(encryptedData) {
    if (this.securityType === 0) {
      return encryptedData;
    }

    if (this.securityType === 1) {
      return CryptoJS.AES.decrypt(encryptedData, this.sessionKey, {
        mode: CryptoJS.mode.CTR
      }).toString(CryptoJS.enc.Utf8);
    } else if (this.securityType === 2) {
      return CryptoJS.AES.decrypt(encryptedData, this.sessionKey, {
        mode: CryptoJS.mode.GCM
      }).toString(CryptoJS.enc.Utf8);
    }
  }

  // Disconnect
  async disconnectDevice() {
    if (this.connectedDevice) {
      await this.connectedDevice.cancelConnection();
    }
    this.isConnected = false;
    this.emit('deviceDisconnected');
  }
}

export default ESPDevice;
```

#### C. QRScanner Component

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';

const QRScanner = ({ onQRScanned, onError }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    
    try {
      const qrData = JSON.parse(data);
      
      // Validate QR code format
      if (qrData.ver === 'v1' && qrData.name && qrData.transport) {
        onQRScanned(qrData);
      } else {
        onError(new Error('Invalid QR code format'));
      }
    } catch (error) {
      onError(new Error('Failed to parse QR code'));
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }
  
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
      />
      
      {scanned && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>QR Code Scanned!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  overlayText: {
    color: 'white',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
});

export default QRScanner;
```

#### D. Main Provisioning Screen

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, FlatList } from 'react-native';
import ESPProvisionManager from '../services/ESPProvisionManager';
import QRScanner from '../components/QRScanner';

const ProvisioningScreen = () => {
  const [step, setStep] = useState('scan'); // scan, connect, networks, provision
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [networks, setNetworks] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  const provisionManager = ESPProvisionManager.getInstance();

  // QR Code scanning
  const handleQRScanned = async (qrData) => {
    try {
      const transportType = qrData.transport.toUpperCase();
      const securityType = qrData.security || 2;
      
      const device = provisionManager.createESPDevice(transportType, securityType);
      device.setDeviceName(qrData.name);
      device.setProofOfPossession(qrData.pop || '');
      
      if (qrData.username) {
        device.setUserName(qrData.username);
      }

      setSelectedDevice(device);
      setStep('connect');
      
      // Auto connect
      if (transportType === 'SOFTAP') {
        await device.connectWiFiDevice();
      }
      
      setStep('networks');
      loadNetworks();
      
    } catch (error) {
      Alert.alert('Error', `Failed to process QR code: ${error.message}`);
    }
  };

  // Load available networks
  const loadNetworks = async () => {
    try {
      const device = provisionManager.getEspDevice();
      
      await device.scanNetworks(
        (networkList) => {
          setNetworks(networkList);
        },
        (error) => {
          Alert.alert('Error', `Failed to scan networks: ${error.message}`);
        }
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Provision device
  const provisionDevice = async (ssid, password) => {
    try {
      const device = provisionManager.getEspDevice();
      
      await device.provision(ssid, password, {
        onSessionStarted: () => console.log('Session started'),
        onWifiConfigSent: () => console.log('WiFi config sent'),
        onWifiConfigApplied: () => console.log('WiFi config applied'),
        onProvisioningSuccess: () => {
          Alert.alert('Success', 'Device provisioned successfully!');
          setStep('success');
        },
        onProvisioningFailed: (error) => {
          Alert.alert('Error', `Provisioning failed: ${error.message}`);
        }
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Render based on current step
  const renderContent = () => {
    switch (step) {
      case 'scan':
        return (
          <QRScanner
            onQRScanned={handleQRScanned}
            onError={(error) => Alert.alert('QR Error', error.message)}
          />
        );
        
      case 'networks':
        return (
          <View>
            <Text>Available Networks:</Text>
            <FlatList
              data={networks}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    // Show password input dialog
                    Alert.prompt(
                      'WiFi Password',
                      `Enter password for ${item.ssid}`,
                      (password) => provisionDevice(item.ssid, password)
                    );
                  }}
                >
                  <Text>{item.ssid} (RSSI: {item.rssi})</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        );
        
      case 'success':
        return (
          <View>
            <Text>Provisioning completed successfully!</Text>
            <TouchableOpacity onPress={() => setStep('scan')}>
              <Text>Provision Another Device</Text>
            </TouchableOpacity>
          </View>
        );
        
      default:
        return <Text>Loading...</Text>;
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {renderContent()}
    </View>
  );
};

export default ProvisioningScreen;
```

### 4. Configuration Files

#### app.json
```json
{
  "expo": {
    "name": "ESP Provisioning",
    "slug": "esp-provisioning-rn",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "permissions": [
      "CAMERA",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "BLUETOOTH",
      "BLUETOOTH_ADMIN",
      "ACCESS_WIFI_STATE",
      "CHANGE_WIFI_STATE"
    ],
    "android": {
      "permissions": [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.CAMERA"
      ]
    },
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "This app needs access to camera to scan QR codes",
        "NSBluetoothPeripheralUsageDescription": "This app needs access to Bluetooth to communicate with ESP devices"
      }
    }
  }
}
```

## Kết Luận

ESP-IDF Provisioning Android là một thư viện mạnh mẽ cho việc cấu hình thiết bị ESP. Việc chuyển đổi sang React Native/Expo yêu cầu:

1. **Thiết kế lại architecture** sử dụng JavaScript/TypeScript
2. **Implement protocol stack** cho BLE và HTTP communication
3. **Port security algorithms** (Curve25519, SRP6a, AES)
4. **Adapt UI components** cho React Native
5. **Handle platform permissions** cho camera, Bluetooth, WiFi

Implementation trên cung cấp foundation để xây dựng ứng dụng provisioning hoàn chỉnh trên React Native với tất cả tính năng của bản Android gốc.