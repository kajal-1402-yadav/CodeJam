const Activity = require("../models/activityModel");
const UserActivityRead = require("../models/userActivityReadModel");
const UserActivityDeleted = require("../models/userActivityDeletedModel");
const mongoose = require("mongoose");

// Get all notifications for the current user
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const type = req.query.type;

    // Get activities that are deleted for this user
    const deletedActivities = await UserActivityDeleted.find({ user: userId }).select('activity');
    const deletedActivityIds = deletedActivities.map(item => item.activity);

    // Get rooms where user is creator or participant
    const Room = require('../models/roomModel');
    const userRooms = await Room.find({
      $or: [
        { createdBy: userId },
        { participants: userId }
      ]
    }).select('_id');

    const roomIds = userRooms.map(room => room._id);

    // Build query for activities - different logic for different activity types
    let query = { _id: { $nin: deletedActivityIds } };

    // Activities that should be shown to all room participants (room-wide activities)
    // But exclude the current user's own activities
    const roomWideActivities = await Activity.find({
      room: { $in: roomIds },
      user: { $ne: userId }, // Exclude current user's activities
      type: {
        $in: [
          'message_sent',
          'file_created',
          'file_edited',
          'file_deleted',
          'file_renamed',
          'code_executed',
          'user_joined',
          'user_left'
        ]
      },
      _id: { $nin: deletedActivityIds }
    });

    // Only show invitation-related activities to the specific user
    // and exclude their own join/leave activities
    const userSpecificActivities = await Activity.find({
      $or: [
        {
          user: userId,
          type: {
            $in: [
              'invitation_sent',
              'invitation_accepted',
              'invitation_declined',
              'room_created',
              'room_updated',
              'room_deleted'
            ]
          }
        },
        // Show other users' join/leave activities but not the current user's
        {
          user: { $ne: userId },
          type: {
            $in: [
              'user_joined',
              'user_left'
            ]
          },
          room: { $in: roomIds } // Only for rooms the user is in
        }
      ],
      _id: { $nin: deletedActivityIds }
    });

    // Combine both types of activities
    const allActivities = [...roomWideActivities, ...userSpecificActivities];

    // Sort by creation date (newest first) and apply pagination
    const sortedActivities = allActivities.sort((a, b) => b.createdAt - a.createdAt);
    const paginatedActivities = sortedActivities.slice((page - 1) * limit, page * limit);

    // Filter by type if provided (apply to already filtered activities)
    let filteredActivities = paginatedActivities;
    if (type && type !== 'All') {
      const typeMapping = {
        'room': ['room_created', 'room_updated', 'room_deleted', 'user_joined', 'user_left'],
        'file': ['file_created', 'file_edited', 'file_deleted', 'file_renamed'],
        'message': ['message_sent'],
        'system': ['code_executed'],
        'invitation': ['invitation_sent', 'invitation_accepted', 'invitation_declined']
      };

      if (typeMapping[type]) {
        filteredActivities = paginatedActivities.filter(activity =>
          typeMapping[type].includes(activity.type)
        );
      }
    }

    // Populate user and room information
    const populatedActivities = await Activity.populate(filteredActivities, [
      { path: 'user', select: 'username email' },
      { path: 'room', select: 'name' }
    ]);

    // Get read status for all these activities
    const activityIds = populatedActivities.map(activity => activity._id);
    const readStatuses = await UserActivityRead.find({
      user: userId,
      activity: { $in: activityIds }
    }).select('activity isRead');

    // Create a map of activity ID to read status
    const readStatusMap = {};
    readStatuses.forEach(status => {
      readStatusMap[status.activity.toString()] = status.isRead;
    });

    // Add read status to activities
    const activitiesWithReadStatus = populatedActivities.map(activity => ({
      ...activity.toObject(),
      isRead: readStatusMap[activity._id.toString()] || false
    }));

    res.status(200).json(activitiesWithReadStatus);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Mark a notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Get rooms where user is creator or participant
    const Room = require('../models/roomModel');
    const userRooms = await Room.find({
      $or: [
        { createdBy: userId },
        { participants: userId }
      ]
    }).select('_id');

    const roomIds = userRooms.map(room => room._id);

    // Verify the activity exists and is accessible to the user
    const activity = await Activity.findOne({
      _id: id,
      $or: [
        { user: userId }, // User-specific activities
        { room: { $in: roomIds } } // Room-wide activities in user's rooms
      ]
    });

    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    // Update or create the read status record
    await UserActivityRead.findOneAndUpdate(
      { user: userId, activity: id },
      { isRead: true },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(400).json({ error: error.message });
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get rooms where user is creator or participant
    const Room = require('../models/roomModel');
    const userRooms = await Room.find({
      $or: [
        { createdBy: userId },
        { participants: userId }
      ]
    }).select('_id');

    const roomIds = userRooms.map(room => room._id);

    // Get activities that are deleted for this user
    const deletedActivities = await UserActivityDeleted.find({ user: userId }).select('activity');
    const deletedActivityIds = deletedActivities.map(item => item.activity);

    // Get room-wide activities (not deleted)
    const roomWideActivities = await Activity.find({
      room: { $in: roomIds },
      type: {
        $in: [
          'message_sent',
          'file_created',
          'file_edited',
          'file_deleted',
          'file_renamed',
          'code_executed'
        ]
      },
      _id: { $nin: deletedActivityIds }
    }).select('_id');

    // Get user-specific activities (not deleted)
    const userSpecificActivities = await Activity.find({
      user: userId,
      type: {
        $in: [
          'user_joined',
          'user_left',
          'invitation_sent',
          'invitation_accepted',
          'invitation_declined',
          'room_created',
          'room_updated',
          'room_deleted'
        ]
      },
      _id: { $nin: deletedActivityIds }
    }).select('_id');

    const allActivities = [...roomWideActivities, ...userSpecificActivities];

    if (allActivities.length === 0) {
      return res.status(200).json({ message: "No notifications to mark as read" });
    }

    // Create read status records for all activities
    const readStatusRecords = allActivities.map(activity => ({
      user: userId,
      activity: activity._id,
      isRead: true
    }));

    // Use bulk write for better performance
    await UserActivityRead.bulkWrite(
      readStatusRecords.map(record => ({
        updateOne: {
          filter: { user: record.user, activity: record.activity },
          update: { isRead: true },
          upsert: true
        }
      }))
    );

    res.status(200).json({ message: `Marked ${allActivities.length} notifications as read` });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(400).json({ error: error.message });
  }
};

// Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Get rooms where user is creator or participant
    const Room = require('../models/roomModel');
    const userRooms = await Room.find({
      $or: [
        { createdBy: userId },
        { participants: userId }
      ]
    }).select('_id');

    const roomIds = userRooms.map(room => room._id);

    // Verify the activity exists and is accessible to the user
    const activity = await Activity.findOne({
      _id: id,
      $or: [
        { user: userId }, // User-specific activities
        { room: { $in: roomIds } } // Room-wide activities in user's rooms
      ]
    });

    if (!activity) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Create a deleted record for this user and activity
    await UserActivityDeleted.findOneAndUpdate(
      { user: userId, activity: id },
      { deletedAt: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(400).json({ error: error.message });
  }
};

// Clear all notifications
const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all activities that are visible to the user
    // This includes both their own activities and activities from rooms they're in
    const Room = require('../models/roomModel');
    
    // Get all rooms where user is a participant or creator
    const userRooms = await Room.find({
      $or: [
        { createdBy: userId },
        { participants: userId }
      ]
    }).select('_id');

    const roomIds = userRooms.map(room => room._id);

    // Get all activity IDs that should be marked as deleted
    // This includes both room activities and user's own activities
    const activities = await Activity.find({
      $or: [
        // Room activities in user's rooms
        {
          room: { $in: roomIds },
          type: {
            $in: [
              'message_sent',
              'file_created',
              'file_edited',
              'file_deleted',
              'file_renamed',
              'code_executed',
              'user_joined',
              'user_left'
            ]
          }
        },
        // User's own activities
        {
          user: userId,
          type: {
            $in: [
              'invitation_sent',
              'invitation_accepted',
              'invitation_declined',
              'room_created',
              'room_updated',
              'room_deleted'
            ]
          }
        }
      ]
    }).select('_id');

    const activityIds = activities.map(a => a._id);
    
    if (activityIds.length === 0) {
      return res.status(200).json({ message: "No notifications to clear" });
    }

    // Mark all these activities as deleted for the current user
    const operations = activityIds.map(activityId => ({
      updateOne: {
        filter: { user: userId, activity: activityId },
        update: { $set: { deletedAt: new Date() } },
        upsert: true
      }
    }));

    // Perform bulk write for better performance
    if (operations.length > 0) {
      await UserActivityDeleted.bulkWrite(operations, { ordered: false });
    }

    res.status(200).json({ message: `Cleared all notifications` });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications
};
