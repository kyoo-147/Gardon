const mongoose = require('mongoose');

const mqttMemberSchema = new mongoose.Schema({
  mqttConfigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MqttConfig',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one user can only be in one MQTT config once
mqttMemberSchema.index({ mqttConfigId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('MqttMember', mqttMemberSchema);
