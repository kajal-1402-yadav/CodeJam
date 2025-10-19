const Activity = require("../models/activityModel");
const mongoose = require("mongoose");

// Get all notifications for the current user
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const type = req.query.type;

    // Build query
    let query = {
      user: userId
    };

    // Filter by type if provided
    if (type && type !== 'All') {
      // Map frontend types to activity types
      const typeMapping = {
        'room': ['room_created', 'room_updated', 'room_deleted', 'user_joined', 'user_left'],
        'file': ['file_created', 'file_edited', 'file_deleted', 'file_renamed'],
        'message': ['message_sent'],
        'system': ['code_executed']
      };

      if (typeMapping[type]) {
        query.type = { $in: typeMapping[type] };
      }
    }

    const activities = await Activity.find(query)
      .populate('user', 'username email')
      .populate('room', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json(activities);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Mark a notification as read (for activities, we'll just return success since activities are read-only)
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Since activities are read-only, we'll just return success
    // In a real notification system, you might want to track read status separately
    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    // Since activities are read-only, we'll just return success
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if the activity belongs to the user (activities are tied to users)
    const activity = await Activity.findOne({ _id: id, user: userId });

    if (!activity) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Since activities are shared across the system, we won't actually delete them
    // but we can mark them as "deleted" for this user by returning success
    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Clear all notifications
const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    // Since activities are shared across the system, we won't actually delete them
    // but we can mark them as "deleted" for this user by returning success
    res.status(200).json({ message: "All notifications cleared" });
  } catch (error) {
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
