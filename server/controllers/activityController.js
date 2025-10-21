const Activity = require('../models/activityModel');
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
    const Room = require('../models/roomModel');
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

    const skip = (page - 1) * limit;

    // Filter activities based on includeTemporary parameter
    let query = { room: roomId };
    if (!includeTemporary) {
      // Only show permanent activities by default
      const permanentTypes = [
        'file_created', 'file_edited', 'file_deleted', 'file_renamed',
        'message_sent', 'code_executed', 'room_created', 'room_updated', 'room_deleted',
        'invitation_sent', 'invitation_accepted', 'invitation_declined'
      ];
      query.type = { $in: permanentTypes };
    }

    const activities = await Activity.find(query)
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Activity.countDocuments(query);

    res.status(200).json({
      activities,
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

    // get rooms where user is creator or participant
    const Room = require('../models/roomModel');
    const userRooms = await Room.find({
      $or: [
        { createdBy: req.user._id },
        { participants: req.user._id }
      ]
    }).select('_id');

    const roomIds = userRooms.map(room => room._id);

    // Filter activities based on includeTemporary parameter
    let query = { room: { $in: roomIds } };
    if (!includeTemporary) {
      // Only show permanent activities by default
      const permanentTypes = [
        'file_created', 'file_edited', 'file_deleted', 'file_renamed',
        'message_sent', 'code_executed', 'room_created', 'room_updated', 'room_deleted',
        'invitation_sent', 'invitation_accepted', 'invitation_declined'
      ];
      query.type = { $in: permanentTypes };
    }

    // get recent activities only for user's rooms
    const activities = await Activity.find(query)
      .populate('user', 'username email')
      .populate('room', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json(activities);
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
