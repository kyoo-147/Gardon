const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const MqttRequest = require('../models/MqttRequest');
const MqttConfig = require('../models/MqttConfig');
const MqttMember = require('../models/MqttMember');
const User = require('../models/User');

// Get all MQTT configs that user can request to join (public ones)
router.get('/available', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get all MQTT configs except user's own
    const availableConfigs = await MqttConfig.find({
      userId: { $ne: userId }
    }).select('name host port userId createdAt');

    // Check which ones user has already requested or is member of
    const existingRequests = await MqttRequest.find({
      requesterUserId: userId,
      status: { $in: ['pending', 'accepted'] }
    }).select('mqttConfigId');

    const existingMembers = await MqttMember.find({
      userId: userId
    }).select('mqttConfigId');

    const excludedConfigIds = [
      ...existingRequests.map(req => req.mqttConfigId.toString()),
      ...existingMembers.map(member => member.mqttConfigId.toString())
    ];

    const filteredConfigs = availableConfigs.filter(
      config => !excludedConfigIds.includes(config._id.toString())
    );

    // Get admin usernames for each config
    const configsWithAdmins = await Promise.all(
      filteredConfigs.map(async (config) => {
        const admin = await User.findOne({ 
          $or: [
            { userId: config.userId },
            { _id: config.userId }
          ]
        }).select('username');
        
        return {
          ...config.toObject(),
          adminUsername: admin?.username || 'Unknown'
        };
      })
    );

    res.json({
      success: true,
      configs: configsWithAdmins
    });
  } catch (error) {
    console.error('Error fetching available MQTT configs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available MQTT configurations'
    });
  }
});

// Send request to join MQTT config
router.post('/request', auth, async (req, res) => {
  try {
    const { mqttConfigId, message } = req.body;
    const userId = req.user.userId;

    if (!mqttConfigId) {
      return res.status(400).json({
        success: false,
        message: 'MQTT configuration ID is required'
      });
    }

    // Check if MQTT config exists
    const mqttConfig = await MqttConfig.findById(mqttConfigId);
    if (!mqttConfig) {
      return res.status(404).json({
        success: false,
        message: 'MQTT configuration not found'
      });
    }

    // Check if user is trying to join their own MQTT
    if (mqttConfig.userId === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot request to join your own MQTT configuration'
      });
    }

    // Check if request already exists
    const existingRequest = await MqttRequest.findOne({
      requesterUserId: userId,
      mqttConfigId: mqttConfigId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: existingRequest.status === 'pending' 
          ? 'Request already sent and pending approval'
          : 'You are already a member of this MQTT configuration'
      });
    }

    // Get requester info
    const requester = await User.findOne({
      $or: [
        { userId: userId },
        { _id: userId }
      ]
    });

    if (!requester) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create new request
    const newRequest = new MqttRequest({
      requesterUserId: userId,
      requesterUsername: requester.username,
      requesterEmail: requester.email,
      mqttConfigId: mqttConfigId,
      mqttConfigName: mqttConfig.name,
      adminUserId: mqttConfig.userId,
      message: message || ''
    });

    await newRequest.save();

    res.json({
      success: true,
      message: 'Request sent successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('Error sending MQTT join request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send join request'
    });
  }
});

// Get pending requests for admin (requests to join user's MQTT configs)
router.get('/pending', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const pendingRequests = await MqttRequest.find({
      adminUserId: userId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      requests: pendingRequests
    });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests'
    });
  }
});

// Respond to MQTT join request (accept/reject)
router.post('/respond', auth, async (req, res) => {
  try {
    const { requestId, action, responseMessage } = req.body;
    const userId = req.user.userId;

    if (!requestId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Request ID and valid action (accept/reject) are required'
      });
    }

    // Find the request
    const request = await MqttRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check if user is the admin of this MQTT config
    if (request.adminUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to respond to this request'
      });
    }

    // Check if request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request has already been responded to'
      });
    }

    // Update request status
    request.status = action === 'accept' ? 'accepted' : 'rejected';
    request.responseMessage = responseMessage || '';
    request.respondedAt = new Date();
    await request.save();

    // If accepted, add user to MQTT members
    if (action === 'accept') {
      const existingMember = await MqttMember.findOne({
        mqttConfigId: request.mqttConfigId,
        userId: request.requesterUserId
      });

      if (!existingMember) {
        const newMember = new MqttMember({
          mqttConfigId: request.mqttConfigId,
          userId: request.requesterUserId,
          username: request.requesterUsername,
          email: request.requesterEmail,
          role: 'member'
        });
        await newMember.save();
      }
    }

    res.json({
      success: true,
      message: `Request ${action}ed successfully`,
      request: request
    });
  } catch (error) {
    console.error('Error responding to MQTT request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to request'
    });
  }
});

// Get user's sent requests
router.get('/sent', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const sentRequests = await MqttRequest.find({
      requesterUserId: userId
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      requests: sentRequests
    });
  } catch (error) {
    console.error('Error fetching sent requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sent requests'
    });
  }
});

module.exports = router;
