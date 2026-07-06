const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderUserId: {
    type: String,
    required: true,
    index: true
  },
  senderUsername: {
    type: String,
    required: true
  },
  receiverUserId: {
    type: String,
    required: true,
    index: true
  },
  receiverUsername: {
    type: String,
    required: true
  },
  mqttConfigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MqttConfig',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  readAt: {
    type: Date
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient chat queries
messageSchema.index({ senderUserId: 1, receiverUserId: 1, createdAt: -1 });
messageSchema.index({ receiverUserId: 1, readAt: 1 }); // For unread messages
messageSchema.index({ mqttConfigId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
