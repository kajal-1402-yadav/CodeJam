const express = require('express');
const router = express.Router();
const {
  createActivity,
  getRoomActivities,
  getAllRoomsActivities,
  cleanupOldActivities
} = require('../controllers/activityController');

const requireAuth = require('../middleware/requireAuth');

// All activity routes require authentication
router.use(requireAuth);

// Create a new activity
router.post('/rooms/:roomId/activities', createActivity);

// Get activities for a specific room with pagination and optional type filter
router.get('/rooms/:roomId/activities', getRoomActivities);

// Get activities for all user's rooms (secured) with pagination and optional type filter
router.get('/activities', getAllRoomsActivities);

// Cleanup old activities (admin only)
router.delete('/activities/cleanup', cleanupOldActivities);

module.exports = router;
