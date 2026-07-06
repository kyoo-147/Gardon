# MQTT Testing Guide

## 🧪 Hướng dẫn sử dụng tính năng Test MQTT

App đã được tích hợp đầy đủ chức năng test MQTT thực tế để kiểm tra kết nối và khả năng giao tiếp publish/subscribe.

### 📍 Cách truy cập tính năng test

#### 1. **MQTT Test Screen (Khuyến nghị)**
- Vào tab **MQTT Config** 
- Nhấn nút **"Test MQTT Connection"** 🧪
- Màn hình này cho phép test toàn diện với giao diện trực quan

#### 2. **Quick Test & Full Test (Trong config screens)**
- Khi tạo hoặc chỉnh sửa MQTT configuration
- **Quick Test**: Test kết nối cơ bản nhanh
- **Full Test**: Mở popup test chi tiết

### 🔧 Các loại test có sẵn

#### **1. Basic Connection Test**
- ✅ Kiểm tra kết nối cơ bản tới MQTT broker
- ✅ Xác nhận host, port, username/password
- ✅ Test timeout và keep-alive settings

#### **2. Full Pub/Sub Test** 
- 🔄 **Step 1**: Test kết nối
- 📥 **Step 2**: Subscribe tới test topic
- 📤 **Step 3**: Publish test message
- 📨 **Step 4**: Kiểm tra nhận được message
- 🧹 **Step 5**: Cleanup kết nối

### 📋 Cách sử dụng

#### **Bước 1: Chọn MQTT Configuration**
```
1. Vào MQTT Test Screen
2. Chọn 1 configuration từ danh sách
3. Configuration sẽ được highlight khi chọn
```

#### **Bước 2: Cấu hình Test Parameters**
```
- Test Topic: topic để test pub/sub (mặc định: test/mqtt-dashboard)
- Test Message: nội dung message để gửi
```

#### **Bước 3: Chạy Test**
```
- Basic Test: Chỉ test kết nối
- Full Pub/Sub Test: Test đầy đủ publish/subscribe
```

#### **Bước 4: Xem kết quả**
```
✅ Thành công: Hiển thị màu xanh với icon check
❌ Lỗi: Hiển thị màu đỏ với mô tả lỗi
📨 Message: Hiển thị messages nhận được
⚠️ Cảnh báo: Các vấn đề không nghiêm trọng
```

### 🌐 Test với các MQTT Brokers phổ biến

#### **1. HiveMQ Public Broker**
```
Host: broker.hivemq.com
Port: 1883 (MQTT) hoặc 8000 (WebSocket)
Protocol: mqtt:// hoặc ws://
Username/Password: Không cần
```

#### **2. Eclipse Mosquitto Test**
```
Host: test.mosquitto.org  
Port: 1883 (MQTT) hoặc 8080 (WebSocket)
Protocol: mqtt:// hoặc ws://
Username/Password: Không cần
```

#### **3. EMQX Public Broker**
```
Host: broker.emqx.io
Port: 1883 (MQTT) hoặc 8083 (WebSocket)
Protocol: mqtt:// hoặc ws://
Username/Password: Không cần
```

### 🔍 Giải thích kết quả test

#### **Connection Test Results:**
- ✅ **"Connection successful"**: Kết nối thành công
- ❌ **"Connection timeout"**: Không thể kết nối trong thời gian cho phép
- ❌ **"Connection refused"**: Broker từ chối kết nối
- ❌ **"Authentication failed"**: Username/password sai

#### **Subscribe Test Results:**
- ✅ **"Subscribed to: topic"**: Subscribe thành công
- ❌ **"Subscribe failed"**: Không thể subscribe topic

#### **Publish Test Results:**
- ✅ **"Published to: topic"**: Gửi message thành công
- ❌ **"Publish failed"**: Không thể gửi message

#### **Message Reception Results:**
- ✅ **"Received X message(s)"**: Nhận được echo message
- ⚠️ **"No messages received"**: Không nhận được message (có thể bình thường với một số broker)
- 📨 **"Message X: content"**: Nội dung messages nhận được

### 🛠️ Xử lý lỗi thường gặp

#### **1. Connection Timeout**
```
Nguyên nhân: 
- Sai host/port
- Firewall chặn
- Mạng chậm

Giải pháp:
- Kiểm tra host/port
- Tăng Connect Timeout
- Thử broker khác
```

#### **2. Authentication Failed**
```
Nguyên nhân:
- Username/password sai
- Broker yêu cầu authentication

Giải pháp:
- Kiểm tra credentials
- Thử không dùng username/password
```

#### **3. Subscribe/Publish Failed**
```
Nguyên nhân:
- Quyền truy cập topic bị hạn chế
- Topic name không hợp lệ

Giải pháp:
- Đổi topic name
- Kiểm tra ACL rules của broker
```

#### **4. No Messages Received**
```
Nguyên nhân:
- Broker không hỗ trợ echo
- Network latency cao
- QoS settings

Giải pháp:
- Đây có thể là bình thường
- Thử broker khác
- Kiểm tra QoS settings
```

### 🎯 Tips sử dụng hiệu quả

1. **Test trước khi deploy**: Luôn test configuration trước khi sử dụng cho devices thực
2. **Dùng public brokers**: Để test nhanh, dùng các public brokers đã liệt kê
3. **Kiểm tra network**: Đảm bảo device và broker có thể kết nối với nhau
4. **Monitor results**: Đọc kỹ kết quả để hiểu vấn đề cụ thể
5. **Clean up**: App tự động clean up connections sau test

### 📱 Demo workflow

```
1. Mở app → Tab MQTT Config
2. Nhấn "Test MQTT Connection" 
3. Chọn 1 configuration (hoặc tạo mới)
4. Nhấn "Full Pub/Sub Test"
5. Xem kết quả real-time:
   🔄 Testing connection...
   ✅ Connection successful
   🔄 Testing subscription...  
   ✅ Subscribed to: test/mqtt-dashboard
   🔄 Testing publish...
   ✅ Published to: test/mqtt-dashboard
   🔄 Waiting for message echo...
   ✅ Received 1 message(s)
   📨 Message 1: Hello from MQTT Dashboard!
   🔄 Cleaning up...
   ✅ Test completed successfully!
```

### 🚀 Tính năng nâng cao

- **Real-time results**: Kết quả hiển thị ngay khi có
- **Comprehensive logging**: Log chi tiết từng bước
- **Multiple protocols**: Hỗ trợ MQTT, MQTTS, WebSocket, WebSocket Secure
- **MQTT 5.0 support**: Đầy đủ tính năng MQTT 5.0
- **Error handling**: Xử lý lỗi chi tiết và gợi ý khắc phục
- **Cleanup**: Tự động dọn dẹp resources sau test

Chúc bạn test thành công! 🎉
