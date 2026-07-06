const mongoose = require('mongoose');
const Device = require('./models/Device');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mqtt_iot_dashboard', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking devices in database...');
    console.log('Database URI:', 'mongodb://localhost:27017/mqtt_iot_dashboard');
    
    // Check all devices
    const allDevices = await Device.find({});
    console.log(`\n📱 Total devices found: ${allDevices.length}`);
    
    if (allDevices.length > 0) {
      console.log('\n📋 All devices:');
      allDevices.forEach((device, index) => {
        console.log(`${index + 1}. Device: "${device.name}"`);
        console.log(`   - ID: ${device._id}`);
        console.log(`   - UserId: ${device.userId}`);
        console.log(`   - Room: ${device.room || 'No room'}`);
        console.log(`   - Type: ${device.widgetType}`);
        console.log(`   - Current State: ${device.currentState?.value || 'Unknown'}`);
        console.log(`   - Online: ${device.currentState?.online || false}`);
        console.log('   ---');
      });
    } else {
      console.log('\n❌ No devices found in database');
    }
    
    // Check specific device named "ddd"
    const dddDevice = await Device.findOne({ name: 'ddd' });
    if (dddDevice) {
      console.log('\n✅ Found device "ddd":');
      console.log('   - ID:', dddDevice._id);
      console.log('   - UserId:', dddDevice.userId);
      console.log('   - State:', dddDevice.currentState?.value);
      console.log('   - Online:', dddDevice.currentState?.online);
    } else {
      console.log('\n❌ Device "ddd" not found');
    }
    
    // Check different userId patterns
    console.log('\n🔍 Checking different userId patterns:');
    
    const navinAgentDevices = await Device.find({ userId: 'navin_agent_user' });
    console.log(`   - navin_agent_user: ${navinAgentDevices.length} devices`);
    
    const anonymousDevices = await Device.find({ userId: 'anonymous' });
    console.log(`   - anonymous: ${anonymousDevices.length} devices`);
    
    const testUserDevices = await Device.find({ userId: 'test_user' });
    console.log(`   - test_user: ${testUserDevices.length} devices`);
    
    // Get unique userIds
    const uniqueUserIds = await Device.distinct('userId');
    console.log('\n📊 Unique userIds in database:', uniqueUserIds);
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

checkDatabase();
