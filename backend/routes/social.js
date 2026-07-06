const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const MqttMember = require('../models/MqttMember');
const MqttConfig = require('../models/MqttConfig');
const Friendship = require('../models/Friendship');
const Message = require('../models/Message');
const User = require('../models/User');

// Get all users in the same MQTT configs as current user
router.get('/mqtt-users', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const MqttConfig = require('../models/MqttConfig');

    // Get all MQTT configs user is member of OR owns
    const userMemberships = await MqttMember.find({
      userId: userId,
      status: 'active'
    }).select('mqttConfigId');

    const ownedConfigs = await MqttConfig.find({
      userId: userId
    }).select('_id');

    // Combine both membership and ownership
    const membershipIds = userMemberships.map(membership => membership.mqttConfigId);
    const ownedIds = ownedConfigs.map(config => config._id);
    const mqttConfigIds = [...membershipIds, ...ownedIds];

    // Get all users in these MQTT configs (including owners and members)
    const allMembers = await MqttMember.find({
      mqttConfigId: { $in: mqttConfigIds },
      userId: { $ne: userId }, // Exclude current user
      status: 'active'
    }).populate('mqttConfigId', 'name');

    // Also get owners of configs where current user is member
    const configOwners = await MqttConfig.find({
      _id: { $in: mqttConfigIds },
      userId: { $ne: userId } // Exclude current user if they own configs
    }).populate('userId', 'username email');

    // Group users by MQTT config and remove duplicates
    const usersByMqtt = {};
    const uniqueUsers = new Map();

    // Add members
    allMembers.forEach(member => {
      const mqttName = member.mqttConfigId.name;
      if (!usersByMqtt[mqttName]) {
        usersByMqtt[mqttName] = [];
      }

      if (!uniqueUsers.has(member.userId)) {
        uniqueUsers.set(member.userId, {
          userId: member.userId,
          username: member.username,
          email: member.email,
          lastActive: member.lastActive,
          mqttConfigs: [mqttName]
        });
      } else {
        uniqueUsers.get(member.userId).mqttConfigs.push(mqttName);
      }
    });

    // Add config owners (lookup their user details)
    for (const config of configOwners) {
      const ownerUser = await User.findOne({
        $or: [
          { userId: config.userId },
          { _id: config.userId }
        ]
      });

      if (ownerUser) {
        const mqttName = config.name;
        if (!usersByMqtt[mqttName]) {
          usersByMqtt[mqttName] = [];
        }

        if (!uniqueUsers.has(config.userId)) {
          uniqueUsers.set(config.userId, {
            userId: config.userId,
            username: ownerUser.username,
            email: ownerUser.email,
            lastActive: config.updatedAt,
            mqttConfigs: [mqttName]
          });
        } else {
          uniqueUsers.get(config.userId).mqttConfigs.push(mqttName);
        }
      }
    }

    // Convert to array and get friendship status for each user
    const users = Array.from(uniqueUsers.values());
    
    const usersWithFriendshipStatus = await Promise.all(
      users.map(async (user) => {
        const friendship = await Friendship.findOne({
          $or: [
            { requesterUserId: userId, targetUserId: user.userId },
            { requesterUserId: user.userId, targetUserId: userId }
          ]
        });

        let friendshipStatus = 'none';
        let canSendRequest = true;

        if (friendship) {
          if (friendship.status === 'accepted') {
            friendshipStatus = 'friends';
            canSendRequest = false;
          } else if (friendship.status === 'pending') {
            if (friendship.requesterUserId === userId) {
              friendshipStatus = 'request_sent';
            } else {
              friendshipStatus = 'request_received';
            }
            canSendRequest = false;
          } else if (friendship.status === 'blocked') {
            friendshipStatus = 'blocked';
            canSendRequest = false;
          }
        }

        return {
          ...user,
          friendshipStatus,
          canSendRequest
        };
      })
    );

    res.json({
      success: true,
      users: usersWithFriendshipStatus
    });
  } catch (error) {
    console.error('Error fetching MQTT users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Send friend request
router.post('/friend-request', authenticateToken, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user.userId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID is required'
      });
    }

    if (targetUserId === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send friend request to yourself'
      });
    }

    // Check if users are in the same MQTT config
    // Get MQTT configs for requester (both owned and member)
    const requesterOwnedConfigs = await MqttConfig.find({ userId: userId }).select('_id');
    const requesterMemberships = await MqttMember.find({
      userId: userId,
      status: 'active'
    }).select('mqttConfigId');

    // Get MQTT configs for target (both owned and member)
    const targetOwnedConfigs = await MqttConfig.find({ userId: targetUserId }).select('_id');
    const targetMemberships = await MqttMember.find({
      userId: targetUserId,
      status: 'active'
    }).select('mqttConfigId');

    // Combine owned and member configs
    const requesterMqttIds = [
      ...requesterOwnedConfigs.map(c => c._id.toString()),
      ...requesterMemberships.map(m => m.mqttConfigId.toString())
    ];
    
    const targetMqttIds = [
      ...targetOwnedConfigs.map(c => c._id.toString()),
      ...targetMemberships.map(m => m.mqttConfigId.toString())
    ];

    // Debug logs
    console.log('🔍 Friend Request Debug:');
    console.log(`Requester ${userId} MQTT IDs:`, requesterMqttIds);
    console.log(`Target ${targetUserId} MQTT IDs:`, targetMqttIds);

    const commonMqttId = requesterMqttIds.find(id => targetMqttIds.includes(id));
    console.log('Common MQTT ID:', commonMqttId);

    if (!commonMqttId) {
      return res.status(400).json({
        success: false,
        message: 'Users must be in the same MQTT configuration to become friends'
      });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requesterUserId: userId, targetUserId: targetUserId },
        { requesterUserId: targetUserId, targetUserId: userId }
      ]
    });

    if (existingFriendship) {
      let message;
      switch (existingFriendship.status) {
        case 'accepted':
          message = 'You are already friends with this user';
          break;
        case 'pending':
          if (existingFriendship.requesterUserId === userId) {
            message = 'Friend request already sent';
          } else {
            message = 'This user has already sent you a friend request';
          }
          break;
        case 'blocked':
          message = 'Unable to send friend request';
          break;
        default:
          message = 'Friend request cannot be sent';
      }
      return res.status(400).json({
        success: false,
        message: message
      });
    }

    // Get user information
    const requester = await User.findOne({
      $or: [{ userId: userId }, { _id: userId }]
    }).select('username');

    const target = await User.findOne({
      $or: [{ userId: targetUserId }, { _id: targetUserId }]
    }).select('username');

    if (!requester || !target) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create friendship request
    const friendship = new Friendship({
      requesterUserId: userId,
      requesterUsername: requester.username,
      targetUserId: targetUserId,
      targetUsername: target.username,
      mqttConfigId: commonMqttId,
      status: 'pending'
    });

    await friendship.save();

    res.json({
      success: true,
      message: 'Friend request sent successfully',
      friendship: friendship
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send friend request'
    });
  }
});

// Get pending friend requests (received)
router.get('/friend-requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const pendingRequests = await Friendship.find({
      targetUserId: userId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      requests: pendingRequests
    });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch friend requests'
    });
  }
});

// Respond to friend request
router.post('/friend-response', authenticateToken, async (req, res) => {
  try {
    const { friendshipId, action } = req.body;
    const userId = req.user.userId;

    if (!friendshipId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Friendship ID and valid action (accept/reject) are required'
      });
    }

    const friendship = await Friendship.findById(friendshipId);
    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    if (friendship.targetUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to respond to this request'
      });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Friend request has already been responded to'
      });
    }

    if (action === 'accept') {
      friendship.status = 'accepted';
      friendship.acceptedAt = new Date();
    } else {
      // For reject, we can delete the request or mark as rejected
      await Friendship.findByIdAndDelete(friendshipId);
      return res.json({
        success: true,
        message: 'Friend request rejected'
      });
    }

    await friendship.save();

    res.json({
      success: true,
      message: `Friend request ${action}ed successfully`,
      friendship: friendship
    });
  } catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to friend request'
    });
  }
});

// Get friends list
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const friendships = await Friendship.find({
      $or: [
        { requesterUserId: userId },
        { targetUserId: userId }
      ],
      status: 'accepted'
    }).sort({ acceptedAt: -1 });

    const friends = friendships.map(friendship => {
      const isRequester = friendship.requesterUserId === userId;
      return {
        friendshipId: friendship._id,
        userId: isRequester ? friendship.targetUserId : friendship.requesterUserId,
        username: isRequester ? friendship.targetUsername : friendship.requesterUsername,
        friendsSince: friendship.acceptedAt,
        mqttConfigId: friendship.mqttConfigId
      };
    });

    res.json({
      success: true,
      friends: friends
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch friends'
    });
  }
});

module.exports = router;
