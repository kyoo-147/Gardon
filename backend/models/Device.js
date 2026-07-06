const mongoose = require('mongoose');

// Schema for widget UI options based on widget type
const uiOptionsSchema = new mongoose.Schema({
  // Button options
  onLabel: { type: String, default: 'ON' },
  offLabel: { type: String, default: 'OFF' },
  
  // Slider options
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  
  // Color picker options
  colorFormat: { type: String, enum: ['hex', 'rgb', 'hsl'], default: 'hex' },
  
  // Time picker options
  timeFormat: { type: String, enum: ['24h', '12h'], default: '24h' },
  
  // Multi-state options
  states: [{
    label: String,
    value: mongoose.Schema.Types.Mixed,
    color: String,
    icon: String
  }],
  
  // Chart options
  chartOptions: {
    type: { type: String, enum: ['line', 'bar', 'pie'], default: 'line' },
    historyLength: { type: Number, default: 100 },
    updateInterval: { type: Number, default: 5000 }, // ms
    yAxisMin: Number,
    yAxisMax: Number
  }
}, { _id: false });

// Schema for MQTT configuration
const mqttConfigSchema = new mongoose.Schema({
  publishTopic: { type: String, required: true },
  subscribeTopic: String,
  qos: { type: Number, enum: [0, 1, 2], default: 1 },
  retain: { type: Boolean, default: false },
  payloadType: { type: String, enum: ['text', 'json'], default: 'text' },
  jsonSchema: mongoose.Schema.Types.Mixed // Optional JSON schema for validation
}, { _id: false });

// Schema for advanced options
const advancedOptionsSchema = new mongoose.Schema({
  showTime: { type: Boolean, default: true },
  showSentLog: { type: Boolean, default: false },
  confirmOnPublish: { type: Boolean, default: false },
  autoReconnect: { type: Boolean, default: true },
  logHistory: { type: Boolean, default: true },
  maxLogEntries: { type: Number, default: 100 }
}, { _id: false });

const deviceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    default: 'devices'
  },
  widgetType: {
    type: String,
    required: true,
    enum: [
      'button', 'switch', 'slider', 'colorPicker', 
      'timePicker', 'textInput', 'multiState', 
      'chart', 'sensor', 'gauge'
    ]
  },
  mqtt: {
    type: mqttConfigSchema,
    required: true
  },
  uiOptions: {
    type: uiOptionsSchema,
    default: {}
  },
  advancedOptions: {
    type: advancedOptionsSchema,
    default: {}
  },
  currentState: {
    value: mongoose.Schema.Types.Mixed, // Current reported value from device
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    online: {
      type: Boolean,
      default: false
    },
    // State management for commands
    desiredState: mongoose.Schema.Types.Mixed, // What we want the device to be
    reportedState: mongoose.Schema.Types.Mixed, // What the device reports it is
    synchronized: { type: Boolean, default: true }, // true if desired = reported
    
    // Pending command tracking
    pendingCommand: {
      command: String,
      value: mongoose.Schema.Types.Mixed,
      sentAt: Date,
      timeoutAt: Date,
      attempts: { type: Number, default: 0 },
      maxAttempts: { type: Number, default: 3 },
      status: { type: String, enum: ['pending', 'confirmed', 'failed', 'timeout'], default: 'pending' }
    },
    
    // Last confirmed command
    lastConfirmedCommand: {
      command: String,
      value: mongoose.Schema.Types.Mixed,
      sentAt: Date,
      confirmedAt: Date
    },
    
    // History
    history: [{
      value: mongoose.Schema.Types.Mixed,
      timestamp: { type: Date, default: Date.now },
      type: { type: String, enum: ['sent', 'received', 'confirmed'], default: 'received' },
      command: String
    }]
  },
  room: {
    type: String,
    default: 'Default',
    trim: true
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  mqttConfigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MqttConfig',
    required: true
  },
  // New fields for better organization
  tags: [String],
  category: {
    type: String,
    default: 'general'
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save hook to limit history size
deviceSchema.pre('save', function(next) {
  if (this.currentState.history && this.currentState.history.length > this.advancedOptions.maxLogEntries) {
    this.currentState.history = this.currentState.history.slice(-this.advancedOptions.maxLogEntries);
  }
  next();
});

// Instance method to add state history with detailed tracking
deviceSchema.methods.addStateHistory = function(value, type = 'received', command = null) {
  if (!this.currentState.history) {
    this.currentState.history = [];
  }
  
  this.currentState.history.push({
    value: value,
    timestamp: new Date(),
    type: type,
    command: command
  });
  
  // Keep only recent entries
  if (this.currentState.history.length > this.advancedOptions.maxLogEntries) {
    this.currentState.history = this.currentState.history.slice(-this.advancedOptions.maxLogEntries);
  }
  
  // Update based on type
  if (type === 'received' || type === 'confirmed') {
    this.currentState.value = value;
    this.currentState.reportedState = value;
    this.currentState.lastUpdated = new Date();
    this.currentState.lastSeen = new Date();
    this.currentState.online = true;
    
    // Check if synchronized with desired state
    this.currentState.synchronized = 
      JSON.stringify(this.currentState.desiredState) === JSON.stringify(this.currentState.reportedState);
    
    // Clear pending command if confirmed
    if (type === 'confirmed' && this.currentState.pendingCommand) {
      this.currentState.lastConfirmedCommand = {
        command: this.currentState.pendingCommand.command,
        value: this.currentState.pendingCommand.value,
        sentAt: this.currentState.pendingCommand.sentAt,
        confirmedAt: new Date()
      };
      this.currentState.pendingCommand = undefined;
    }
  }
};

// Method to set desired state and track pending command
deviceSchema.methods.setDesiredState = function(command, value, timeoutMs = 30000) {
  this.currentState.desiredState = value;
  this.currentState.synchronized = false;
  
  // Set pending command with timeout
  this.currentState.pendingCommand = {
    command: command,
    value: value,
    sentAt: new Date(),
    timeoutAt: new Date(Date.now() + timeoutMs),
    attempts: (this.currentState.pendingCommand?.attempts || 0) + 1,
    maxAttempts: 3,
    status: 'pending'
  };
  
  // Add to history
  this.addStateHistory(value, 'sent', command);
};

// Method to check if command timed out
deviceSchema.methods.checkCommandTimeout = function() {
  if (this.currentState.pendingCommand && 
      this.currentState.pendingCommand.timeoutAt < new Date()) {
    
    if (this.currentState.pendingCommand.attempts < this.currentState.pendingCommand.maxAttempts) {
      // Can retry
      this.currentState.pendingCommand.status = 'timeout';
      return 'retry';
    } else {
      // Max attempts reached
      this.currentState.pendingCommand.status = 'failed';
      this.currentState.synchronized = false;
      return 'failed';
    }
  }
  return 'pending';
};

// Method to confirm command execution
deviceSchema.methods.confirmCommand = function(value) {
  if (this.currentState.pendingCommand && 
      JSON.stringify(this.currentState.pendingCommand.value) === JSON.stringify(value)) {
    this.addStateHistory(value, 'confirmed', this.currentState.pendingCommand.command);
    return true;
  }
  return false;
};

// Method to get sync status
deviceSchema.methods.getSyncStatus = function() {
  const hasTimeout = this.checkCommandTimeout();
  
  return {
    synchronized: this.currentState.synchronized,
    pendingCommand: this.currentState.pendingCommand,
    timeoutStatus: hasTimeout,
    lastSeen: this.currentState.lastSeen,
    online: this.currentState.online
  };
};

// Static method to get devices by widget type
deviceSchema.statics.getByWidgetType = function(userId, widgetType) {
  return this.find({ userId, widgetType, isEnabled: true });
};

// Virtual for formatted last updated time
deviceSchema.virtual('lastUpdatedFormatted').get(function() {
  return this.currentState.lastUpdated.toLocaleString();
});

module.exports = mongoose.model('Device', deviceSchema);
