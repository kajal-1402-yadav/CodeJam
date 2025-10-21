const express = require('express');
const router = express.Router();
const {
    sendInvitation,
    getUserInvitations,
    respondToInvitation,
    getSentInvitations
} = require("../controllers/invitationController");

const requireAuth = require('../middleware/requireAuth');

// All invitation routes require authentication
router.use(requireAuth);

// Send an invitation
router.post('/send', sendInvitation);

// Get invitations for the current user
router.get('/received', getUserInvitations);

// Get invitations sent by the current user
router.get('/sent', getSentInvitations);

// Respond to an invitation (accept/decline)
router.post('/respond', respondToInvitation);

module.exports = router;
