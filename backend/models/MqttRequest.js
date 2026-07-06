const mongoose = require('mongoose');

const mqttRequestSchema = new mongoose.Schema({
  requesterUserId: {
    type: String,
    required: true,
    index: true
  },
  requesterUsername: {
    type: String,
    required: true
  },
  requesterEmail: {
    type: String,
    required: true
  },
  mqttConfigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MqttConfig',
    required: true,
    index: true
  },
  mqttConfigName: {
    type: String,
    required: true
  },
  adminUserId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
    index: true
  },
  message: {
    type: String,
    default: ''
  },
  responseMessage: {
    type: String,
    default: ''
  },
  respondedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
mqttRequestSchema.index({ adminUserId: 1, status: 1 });
mqttRequestSchema.index({ requesterUserId: 1, mqttConfigId: 1 });

module.exports = mongoose.model('MqttRequest', mqttRequestSchema);
