const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  requesterUserId: {
    type: String,
    required: true,
    index: true
  },
  requesterUsername: {
    type: String,
    required: true
  },
  targetUserId: {
    type: String,
    required: true,
    index: true
  },
  targetUsername: {
    type: String,
    required: true
  },
  mqttConfigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MqttConfig',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'pending',
    index: true
  },
  acceptedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
friendshipSchema.index({ requesterUserId: 1, targetUserId: 1 }, { unique: true });
friendshipSchema.index({ targetUserId: 1, status: 1 });
friendshipSchema.index({ mqttConfigId: 1, status: 1 });

module.exports = mongoose.model('Friendship', friendshipSchema);
