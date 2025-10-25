const Activity = require('../models/activityModel');
const Room = require('../models/roomModel');
const UserActivityRead = require('../models/userActivityReadModel');
const UserActivityDeleted = require('../models/userActivityDeletedModel');
const mongoose = require('mongoose');

// auto-generate activity descriptions
const generateActivityDescription = (type, metadata, userName) => {
  const { filename, message, oldName, newName, language, executionTime, exitCode, roomName, invitedUserEmail, invitedUserName, response } = metadata || {};

  switch (type) {
    case 'file_created':
      return `${userName} created file "${filename}"`;
    case 'file_edited':
      return `${userName} edited file "${filename}"`;
    case 'file_deleted':
      return `${userName} deleted file "${filename}"`;
    case 'file_renamed':
      return `${userName} renamed file "${oldName}" to "${newName}"`;
    case 'message_sent':
      // Show the actual message content
      return `${userName} sent: "${message}"`;
    case 'code_executed':
      const status = exitCode === 0 ? 'successfully' : 'with errors';
      const timeInfo = executionTime ? ` in ${executionTime}ms` : '';
      return `${userName} executed code "${filename || 'script'}" ${status}${timeInfo}`;
    case 'room_created':
      return `${userName} created room "${roomName}"`;
    case 'room_deleted':
      return `${userName} deleted room "${roomName}"`;
    case 'room_updated':
      const updateDetails = metadata.updateDetails ? ` (${metadata.updateDetails})` : '';
      return `${userName} updated room "${roomName}"${updateDetails}`;
    case 'invitation_sent':
      return `${userName} sent an invitation to ${invitedUserName || invitedUserEmail}`;
    case 'invitation_accepted':
      return `${userName} accepted an invitation to join "${roomName}"`;
    case 'invitation_declined':
      return `${userName} declined an invitation to join "${roomName}"`;
    default:
      return `${userName} performed ${type}`;
  }
};

// create a new activity
const createActivity = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { type, metadata } = req.body;

    // validate required fields
    if (!type) {
      return res.status(400).json({
        error: 'Activity type is required'
      });
    }

    // validate room ID
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    // validate user authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Get room name for metadata
    const room = await Room.findById(roomId).select('name');
    const roomName = room?.name || 'Unknown Room';

    // auto-generate description based on activity type
    const description = generateActivityDescription(type, { ...metadata, roomName }, req.user.username);

    const activity = await Activity.create({
      room: roomId,
      user: req.user._id,
      type,
      description,
      metadata: { ...metadata, roomName }
    });

    // Create read status record for the activity owner (initially unread)
    await UserActivityRead.create({
      user: req.user._id,
      activity: activity._id,
      isRead: false
    });

    // populate user information for the response
    const populatedActivity = await Activity.findById(activity._id)
      .populate('user', 'username email')
      .populate('room', 'name');

    res.status(201).json(populatedActivity);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(400).json({ error: error.message });
  }
};

// get activities for a specific room
const getRoomActivities = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, page = 1, includeTemporary = false } = req.query;

    // validate room ID
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    // Get activities that are deleted for this user
    const deletedActivities = await UserActivityDeleted.find({ user: req.user._id }).select('activity');
    const deletedActivityIds = deletedActivities.map(item => item.activity);

    const skip = (page - 1) * limit;

    // Activities that should be shown to all room participants (room-wide activities)
    const roomWideActivities = await Activity.find({
      room: roomId,
      type: {
        $in: [
          // Activity Only (History/Log Feed) - Historical events for tracking
          'file_edited',
          'message_sent',
          'code_executed',
          'room_updated',
          // Both Activity + Notifications - Important events for both record and alerts
          'file_created',
          'file_deleted',
          'file_renamed',
          'room_created',
          'room_deleted'
        ]
      },
      _id: { $nin: deletedActivityIds }
    });

    // Activities that should only be shown to the specific user (user-specific activities)
    // Only include user's own join/leave activities for activity history
    const userSpecificActivities = await Activity.find({
      user: req.user._id,
      room: roomId,
      type: {
        $in: [
          // Both Activity + Notifications - User's own activities should show in their activity feed
          'user_joined',
          'user_left',
          'room_created',
          'room_deleted'
        ]
      },
      _id: { $nin: deletedActivityIds }
    });

    // Combine both types of activities
    const allActivities = [...roomWideActivities, ...userSpecificActivities];

    // Remove duplicates based on activity ID (backend deduplication)
    const uniqueActivities = allActivities.filter((activity, index, self) =>
      index === self.findIndex(a => a._id.toString() === activity._id.toString())
    );

    // Sort by creation date (newest first) and apply pagination
    const sortedActivities = uniqueActivities.sort((a, b) => b.createdAt - a.createdAt);
    const paginatedActivities = sortedActivities.slice(skip, skip + limit);

    // Filter by temporary activities if needed
    let filteredActivities = paginatedActivities;
    if (!includeTemporary) {
      const permanentTypes = [
        // Activity Only (History/Log Feed) - Historical events for tracking
        'file_edited', 'message_sent', 'code_executed', 'room_updated',
        // Both Activity + Notifications - Important events for both record and alerts
        'file_created', 'file_deleted', 'file_renamed', 'user_joined', 'user_left', 'room_created', 'room_deleted'
      ];
      filteredActivities = paginatedActivities.filter(activity =>
        permanentTypes.includes(activity.type)
      );
    }

    // Populate user information
    const populatedActivities = await Activity.populate(filteredActivities, [
      { path: 'user', select: 'username email' }
    ]);

    // Get read status for all these activities for the current user
    const activityIds = populatedActivities.map(activity => activity._id);
    const readStatuses = await UserActivityRead.find({
      user: req.user._id,
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

    const total = uniqueActivities.length;

    res.status(200).json({
      activities: activitiesWithReadStatus,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching room activities:', error);
    res.status(400).json({ error: error.message });
  }
};

// get activities for all rooms (for the rooms overview)
const getAllRoomsActivities = async (req, res) => {
  try {
    const { limit = 10, includeTemporary = false } = req.query;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Get activities that are deleted for this user
    const deletedActivities = await UserActivityDeleted.find({ user: req.user._id }).select('activity');
    const deletedActivityIds = deletedActivities.map(item => item.activity);

    // get rooms where user is creator or participant
    const userRooms = await Room.find({
      $or: [
        { createdBy: req.user._id },
        { participants: req.user._id }
      ]
    }).select('_id');

    const roomIds = userRooms.map(room => room._id);

    // Get room-wide activities (not deleted)
    const roomWideActivities = await Activity.find({
      room: { $in: roomIds },
      type: {
        $in: [
          // Activity Only (History/Log Feed) - Historical events for tracking
          'file_edited', 'message_sent', 'code_executed', 'room_updated',
          // Both Activity + Notifications - Important events for both record and alerts
          'file_created', 'file_deleted', 'file_renamed', 'room_created', 'room_deleted'
        ]
      },
      _id: { $nin: deletedActivityIds }
    });

    // Get user-specific activities (not deleted)
    const userSpecificActivities = await Activity.find({
      user: req.user._id,
      type: {
        $in: [
          // Both Activity + Notifications - User's own activities should show in their activity feed
          'user_joined', 'user_left', 'room_created', 'room_deleted'
        ]
      },
      _id: { $nin: deletedActivityIds }
    });

    // Combine both types of activities
    const allActivities = [...roomWideActivities, ...userSpecificActivities];

    // Remove duplicates based on activity ID (backend deduplication)
    const uniqueActivities = allActivities.filter((activity, index, self) =>
      index === self.findIndex(a => a._id.toString() === activity._id.toString())
    );

    // Sort by creation date (newest first) and apply pagination
    const sortedActivities = uniqueActivities.sort((a, b) => b.createdAt - a.createdAt);
    const paginatedActivities = sortedActivities.slice(0, parseInt(limit));

    // Filter by temporary activities if needed
    let filteredActivities = paginatedActivities;
    if (!includeTemporary) {
      const permanentTypes = [
        // Activity Only (History/Log Feed) - Historical events for tracking
        'file_edited', 'message_sent', 'code_executed', 'room_updated',
        // Both Activity + Notifications - Important events for both record and alerts
        'file_created', 'file_deleted', 'file_renamed', 'user_joined', 'user_left', 'room_created', 'room_deleted'
      ];
      filteredActivities = paginatedActivities.filter(activity =>
        permanentTypes.includes(activity.type)
      );
    }

    // Populate user and room information
    const populatedActivities = await Activity.populate(filteredActivities, [
      { path: 'user', select: 'username email' },
      { path: 'room', select: 'name' }
    ]);

    // Get read status for all these activities for the current user
    const activityIds = populatedActivities.map(activity => activity._id);
    const readStatuses = await UserActivityRead.find({
      user: req.user._id,
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
    console.error('Error fetching all rooms activities:', error);
    res.status(400).json({ error: error.message });
  }
};

// delete old activities (cleanup function)
const cleanupOldActivities = async (req, res) => {
  try {
    // delete activities older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await Activity.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });

    res.status(200).json({
      message: `Deleted ${result.deletedCount} old activities`
    });
  } catch (error) {
    console.error('Error cleaning up activities:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createActivity,
  getRoomActivities,
  getAllRoomsActivities,
  cleanupOldActivities
};
