const mongoose = require('mongoose');

const mqttConfigSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  host: {
    type: String,
    required: true
  },
  port: {
    type: Number,
    required: true,
    default: 8083
  },
  protocol: {
    type: String,
    enum: ['mqtt', 'mqtts', 'ws', 'wss'],
    default: 'ws'
  },
  path: {
    type: String,
    default: '/mqtt'
  },
  username: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    default: ''
  },
  clientId: {
    type: String,
    required: true
  },
  mqttVersion: {
    type: String,
    enum: ['3.1.1', '5.0'],
    default: '5.0'
  },
  connectTimeout: {
    type: Number,
    default: 10000
  },
  keepAlive: {
    type: Number,
    default: 60
  },
  autoReconnect: {
    type: Boolean,
    default: true
  },
  reconnectPeriod: {
    type: Number,
    default: 4000
  },
  cleanStart: {
    type: Boolean,
    default: true
  },
  sessionExpiryInterval: {
    type: Number,
    default: 0
  },
  receiveMaximum: {
    type: Number,
    default: 65535
  },
  maximumPacketSize: {
    type: Number,
    default: 268435455
  },
  topicAliasMaximum: {
    type: Number,
    default: 65535
  },
  requestResponseInfo: {
    type: Boolean,
    default: false
  },
  requestProblemInfo: {
    type: Boolean,
    default: false
  },
  useSSL: {
    type: Boolean,
    default: false
  },
  userProperties: [{
    key: String,
    value: String
  }],
  lastWillTopic: {
    type: String,
    default: ''
  },
  lastWillQos: {
    type: Number,
    enum: [0, 1, 2],
    default: 0
  },
  lastWillRetain: {
    type: Boolean,
    default: false
  },
  lastWillPayload: {
    type: String,
    default: ''
  },
  lastWillPayloadFormatIndicator: {
    type: Boolean,
    default: false
  },
  lastWillDelayInterval: {
    type: Number,
    default: 0
  },
  lastWillMessageExpiryInterval: {
    type: Number,
    default: 0
  },
  lastWillContentType: {
    type: String,
    default: ''
  },
  lastWillResponseTopic: {
    type: String,
    default: ''
  },
  lastWillCorrelationData: {
    type: String,
    default: ''
  },
  cleanSession: {
    type: Boolean,
    default: true
  },
  protocolId: {
    type: String,
    default: 'MQTT'
  },
  protocolVersion: {
    type: Number,
    default: 5
  },
  description: {
    type: String,
    default: ''
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate unique client ID if not provided
mqttConfigSchema.pre('save', function(next) {
  if (!this.clientId) {
    this.clientId = `mqttx_${Math.random().toString(16).substr(2, 8)}`;
  }
  next();
});

// Build connection URL
mqttConfigSchema.methods.getConnectionUrl = function() {
  const protocol = this.protocol || (this.useSSL ? 'wss' : 'ws');
  const port = this.port;
  
  if (protocol === 'ws' || protocol === 'wss') {
    return `${protocol}://${this.host}:${port}${this.path || '/mqtt'}`;
  } else {
    const mqttProtocol = this.useSSL ? 'mqtts' : 'mqtt';
    return `${mqttProtocol}://${this.host}:${port}`;
  }
};

// Get connection options for MQTT client
mqttConfigSchema.methods.getConnectionOptions = function() {
  const options = {
    clientId: this.clientId,
    username: this.username || undefined,
    password: this.password || undefined,
    keepalive: this.keepAlive,
    connectTimeout: this.connectTimeout,
    reconnectPeriod: this.autoReconnect ? this.reconnectPeriod : 0,
    clean: this.cleanStart,
    protocolVersion: this.mqttVersion === '5.0' ? 5 : 4,
  };

  // Last Will and Testament
  if (this.lastWillTopic) {
    options.will = {
      topic: this.lastWillTopic,
      payload: this.lastWillPayload,
      qos: this.lastWillQos,
      retain: this.lastWillRetain
    };
  }

  return options;
};

// Ensure only one default config per user
mqttConfigSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model('MqttConfig', mqttConfigSchema);
