const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications
} = require('../controllers/notificationController');

const requireAuth = require('../middleware/requireAuth');

// All notification routes require authentication
router.use(requireAuth);

// Get all notifications
router.get('/', getNotifications);

// Mark notification as read
router.patch('/:id/read', markNotificationAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', markAllNotificationsAsRead);

// Delete a notification
router.delete('/:id', deleteNotification);

// Clear all notifications
router.delete('/', clearAllNotifications);

module.exports = router;
