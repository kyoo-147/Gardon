const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Message = require('../models/Message');
const Friendship = require('../models/Friendship');
const User = require('../models/User');

// Send message to friend
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { receiverUserId, content, type = 'text' } = req.body;
    const senderUserId = req.user.userId;

    if (!receiverUserId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Receiver user ID and content are required'
      });
    }

    if (senderUserId === receiverUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send message to yourself'
      });
    }

    // Check if users are friends
    const friendship = await Friendship.findOne({
      $or: [
        { requesterUserId: senderUserId, targetUserId: receiverUserId },
        { requesterUserId: receiverUserId, targetUserId: senderUserId }
      ],
      status: 'accepted'
    });

    if (!friendship) {
      return res.status(403).json({
        success: false,
        message: 'You can only send messages to friends'
      });
    }

    // Get user information
    const sender = await User.findOne({
      $or: [{ userId: senderUserId }, { _id: senderUserId }]
    }).select('username');

    const receiver = await User.findOne({
      $or: [{ userId: receiverUserId }, { _id: receiverUserId }]
    }).select('username');

    if (!sender || !receiver) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create message
    const message = new Message({
      senderUserId: senderUserId,
      senderUsername: sender.username,
      receiverUserId: receiverUserId,
      receiverUsername: receiver.username,
      mqttConfigId: friendship.mqttConfigId,
      content: content,
      type: type
    });

    await message.save();

    res.json({
      success: true,
      message: 'Message sent successfully',
      messageData: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// Get conversation between two users
router.get('/conversation/:friendUserId', authenticateToken, async (req, res) => {
  try {
    const { friendUserId } = req.params;
    const userId = req.user.userId;
    const { page = 1, limit = 50 } = req.query;

    if (!friendUserId) {
      return res.status(400).json({
        success: false,
        message: 'Friend user ID is required'
      });
    }

    // Check if users are friends
    const friendship = await Friendship.findOne({
      $or: [
        { requesterUserId: userId, targetUserId: friendUserId },
        { requesterUserId: friendUserId, targetUserId: userId }
      ],
      status: 'accepted'
    });

    if (!friendship) {
      return res.status(403).json({
        success: false,
        message: 'You can only view conversations with friends'
      });
    }

    // Get messages between users
    const skip = (page - 1) * limit;
    const messages = await Message.find({
      $or: [
        { senderUserId: userId, receiverUserId: friendUserId },
        { senderUserId: friendUserId, receiverUserId: userId }
      ],
      isDeleted: false
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Reverse to show oldest first
    messages.reverse();

    // Mark messages as read
    await Message.updateMany({
      senderUserId: friendUserId,
      receiverUserId: userId,
      readAt: null
    }, {
      readAt: new Date()
    });

    res.json({
      success: true,
      messages: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation'
    });
  }
});

// Get all conversations for user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all friendships
    const friendships = await Friendship.find({
      $or: [
        { requesterUserId: userId },
        { targetUserId: userId }
      ],
      status: 'accepted'
    });

    // Get last message for each friendship
    const conversations = await Promise.all(
      friendships.map(async (friendship) => {
        const friendUserId = friendship.requesterUserId === userId 
          ? friendship.targetUserId 
          : friendship.requesterUserId;
        
        const friendUsername = friendship.requesterUserId === userId 
          ? friendship.targetUsername 
          : friendship.requesterUsername;

        // Get last message
        const lastMessage = await Message.findOne({
          $or: [
            { senderUserId: userId, receiverUserId: friendUserId },
            { senderUserId: friendUserId, receiverUserId: userId }
          ],
          isDeleted: false
        }).sort({ createdAt: -1 });

        // Get unread count
        const unreadCount = await Message.countDocuments({
          senderUserId: friendUserId,
          receiverUserId: userId,
          readAt: null,
          isDeleted: false
        });

        return {
          friendUserId,
          friendUsername,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            type: lastMessage.type,
            createdAt: lastMessage.createdAt,
            isFromMe: lastMessage.senderUserId === userId
          } : null,
          unreadCount,
          updatedAt: lastMessage ? lastMessage.createdAt : friendship.acceptedAt
        };
      })
    );

    // Sort by last activity
    conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({
      success: true,
      conversations: conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations'
    });
  }
});

// Mark message as read
router.post('/mark-read', authenticateToken, async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user.userId;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        success: false,
        message: 'Message IDs array is required'
      });
    }

    // Mark messages as read (only if user is the receiver)
    const result = await Message.updateMany({
      _id: { $in: messageIds },
      receiverUserId: userId,
      readAt: null
    }, {
      readAt: new Date()
    });

    res.json({
      success: true,
      message: 'Messages marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read'
    });
  }
});

// Get unread message count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const unreadCount = await Message.countDocuments({
      receiverUserId: userId,
      readAt: null,
      isDeleted: false
    });

    res.json({
      success: true,
      unreadCount: unreadCount
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
});

// Delete message
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender can delete message
    if (message.senderUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    message.isDeleted = true;
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message'
    });
  }
});

module.exports = router;
