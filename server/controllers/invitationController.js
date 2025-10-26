const Invitation = require("../models/invitationModel");
const Room = require("../models/roomModel");
const User = require("../models/userModel");
const Activity = require("../models/activityModel");
const mongoose = require("mongoose");

// Send an invitation to a user for a room
const sendInvitation = async (req, res) => {
    try {
        const { roomId, invitedUserEmail, message } = req.body;
        const invitedBy = req.user._id;

        // Validate input
        if (!roomId || !invitedUserEmail) {
            return res.status(400).json({ error: "Room ID and invited user email are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }

        // Check if the room exists and user is a participant
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ error: "Room not found" });
        }

        if (!room.participants.includes(invitedBy)) {
            return res.status(403).json({ error: "You must be a participant of the room to send invitations" });
        }

        // Find the user to invite by email
        const invitedUser = await User.findOne({ email: invitedUserEmail.toLowerCase() });
        if (!invitedUser) {
            return res.status(404).json({ error: "User not found with this email address" });
        }

        // Check if user is already a participant
        if (room.participants.includes(invitedUser._id)) {
            return res.status(400).json({ error: "User is already a participant in this room" });
        }

        // Check if there's already a pending invitation
        const existingInvitation = await Invitation.findOne({
            room: roomId,
            invitedUser: invitedUser._id,
            status: 'pending'
        });

        if (existingInvitation) {
            return res.status(400).json({ error: "User already has a pending invitation for this room" });
        }

        // Create the invitation
        const invitation = await Invitation.create({
            room: roomId,
            invitedBy,
            invitedUser: invitedUser._id,
            message
        });

        // Create activity for invitation sent - BOTH for sender and receiver
        try {
            // 1. Activity for the SENDER (inviter) - record that they sent an invitation
            const senderActivity = await Activity.create({
                type: 'invitation_sent',
                user: invitedBy, // SENDER gets the activity
                room: roomId,
                description: `Invitation sent to ${invitedUserEmail} for room "${room.name}"`,
                metadata: {
                    invitedUserEmail: invitedUserEmail,
                    invitedUserName: invitedUser.username,
                    roomName: room.name,
                    invitedBy: invitedBy,
                    invitedByName: req.user.username,
                    invitationId: invitation._id,
                    isSenderActivity: true // Flag to distinguish sender's activity
                }
            });

            // Populate and emit sender's activity
            const populatedSenderActivity = await Activity.findById(senderActivity._id)
                .populate('user', 'username email')
                .populate('room', 'name');
            if (req.io) {
                req.io.emit('activityCreated', populatedSenderActivity);
            }

            // 2. Activity for the RECEIVER (invitee) - actionable invitation
            const receiverActivity = await Activity.create({
                type: 'invitation_sent',
                user: invitedUser._id, // RECEIVER gets the activity
                room: roomId,
                description: `You have been invited to join "${room.name}" by ${req.user.username}`,
                metadata: {
                    invitedUserEmail: invitedUserEmail,
                    invitedUserName: invitedUser.username,
                    roomName: room.name,
                    invitedBy: invitedBy,
                    invitedByName: req.user.username,
                    invitationId: invitation._id,
                    isReceiverActivity: true // Flag to distinguish receiver's activity
                }
            });

            // Populate and emit receiver's activity
            const populatedReceiverActivity = await Activity.findById(receiverActivity._id)
                .populate('user', 'username email')
                .populate('room', 'name');
            if (req.io) {
                req.io.emit('activityCreated', populatedReceiverActivity);
            }

        } catch (activityError) {
            console.error('Error creating invitation activities:', activityError);
        }

        // Populate the invitation for response
        const populatedInvitation = await Invitation.findById(invitation._id)
            .populate('room', 'name')
            .populate('invitedBy', 'username email')
            .populate('invitedUser', 'username email');

        res.status(201).json({
            success: true,
            message: "Invitation sent successfully",
            data: populatedInvitation
        });

    } catch (error) {
        console.error('Error sending invitation:', error);
        // Provide more specific error messages based on the error type
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: 'Validation error', details: errors });
        }
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Duplicate invitation error' });
        }
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get invitations for the current user
const getUserInvitations = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query; // Optional filter by status

        let filter = {
            invitedUser: userId,
            status: 'pending',
            expiresAt: { $gt: new Date() } // Only non-expired invitations
        };
        if (status) {
            filter.status = status;
        }

        const invitations = await Invitation.find(filter)
            .populate('room', 'name')
            .populate('invitedBy', 'username email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: invitations
        });

    } catch (error) {
        console.error('Error getting invitations:', error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Respond to an invitation (accept/decline)
const respondToInvitation = async (req, res) => {
    try {
        const { invitationId, response } = req.body; // response: 'accept' or 'decline'
        const userId = req.user._id;

        if (!invitationId || !response) {
            return res.status(400).json({ error: "Invitation ID and response are required" });
        }

        if (!['accept', 'decline'].includes(response)) {
            return res.status(400).json({ error: "Response must be 'accept' or 'decline'" });
        }

        if (!mongoose.Types.ObjectId.isValid(invitationId)) {
            return res.status(400).json({ error: "Invalid invitation ID" });
        }

        // Find the invitation
        const invitation = await Invitation.findById(invitationId);
        if (!invitation) {
            return res.status(404).json({ error: "Invitation not found" });
        }

        // Check if the user is the invited user
        if (invitation.invitedUser.toString() !== userId.toString()) {
            return res.status(403).json({ error: "You can only respond to your own invitations" });
        }

        // Check if invitation is still pending
        if (invitation.status !== 'pending') {
            return res.status(400).json({ error: "This invitation has already been responded to" });
        }

        // Check if invitation has expired
        if (invitation.expiresAt < new Date()) {
            invitation.status = 'expired';
            await invitation.save();
            return res.status(400).json({ error: "This invitation has expired" });
        }

        // Get inviter information for notifications
        const inviter = await User.findById(invitation.invitedBy).select('username email');
        const invitee = await User.findById(userId).select('username email');

        // Update invitation status
        invitation.status = response === 'accept' ? 'accepted' : 'declined';
        // Set expiresAt to now so invitation expires immediately (will be auto-deleted by TTL)
        invitation.expiresAt = new Date();
        await invitation.save();

        let roomUpdate = {};

        // If accepted, add user to room participants
        if (response === 'accept') {
            roomUpdate = {
                $addToSet: { participants: userId }
            };

            // Emit socket event for room participant update
            if (req.io) {
                req.io.emit("roomParticipantsUpdated", {
                    roomId: invitation.room,
                    participants: (await Room.findById(invitation.room)).participants.length + 1
                });

                // Emit userJoinedRoom event for dashboard updates
                const room = await Room.findById(invitation.room).populate('createdBy participants', 'name email _id username');
                req.io.emit("userJoinedRoom", {
                    roomId: invitation.room,
                    room: room
                });
            }
        }

        // Update the room
        await Room.findByIdAndUpdate(invitation.room, roomUpdate);

        // Get room data for activities
        const roomData = await Room.findById(invitation.room);

        // Create activities for invitation response - BOTH for receiver and sender
        try {
            // 1. Activity for the RECEIVER (invitee) - confirmation
            let receiverActivity;
            if (response === 'accept') {
                // For accepted invitations, create invitation_accepted activity for the receiver
                receiverActivity = await Activity.create({
                    type: 'invitation_accepted',
                    user: userId, // RECEIVER gets the activity
                    room: invitation.room,
                    description: `You accepted an invitation to join "${roomData.name}"`,
                    metadata: {
                        roomName: roomData.name,
                        invitationId: invitationId,
                        response: response,
                        acceptedInvitation: true // Flag to indicate invitation was accepted
                    }
                });
            } else {
                // For declined invitations, create invitation_declined for receiver
                receiverActivity = await Activity.create({
                    type: 'invitation_declined',
                    user: userId, // RECEIVER gets the activity
                    room: invitation.room,
                    description: `You declined the invitation to "${roomData.name}"`,
                    metadata: {
                        roomName: roomData.name,
                        invitationId: invitationId,
                        response: response,
                        declinedInvitation: true // Flag to indicate invitation was declined
                    }
                });
            }

            // Populate and emit receiver's activity
            const populatedReceiverActivity = await Activity.findById(receiverActivity._id)
                .populate('user', 'username email')
                .populate('room', 'name');
            if (req.io) {
                req.io.emit('activityCreated', populatedReceiverActivity);
            }

            // 2. Activity for the SENDER (inviter) - notification about response
            const senderActivity = await Activity.create({
                type: response === 'accept' ? 'invitation_accepted' : 'invitation_declined',
                user: invitation.invitedBy, // SENDER gets the activity
                room: invitation.room,
                description: response === 'accept'
                    ? `Invitation received by ${invitee.username} for "${roomData.name}"`
                    : `Invitation declined by ${invitee.username} for "${roomData.name}"`,
                metadata: {
                    roomName: roomData.name,
                    invitationId: invitationId,
                    response: response,
                    inviteeName: invitee.username,
                    inviteeEmail: invitee.email,
                    isSenderNotification: true // Flag to indicate this is sender notification
                }
            });

            // Populate and emit sender's activity
            const populatedSenderActivity = await Activity.findById(senderActivity._id)
                .populate('user', 'username email')
                .populate('room', 'name');
            if (req.io) {
                req.io.emit('activityCreated', populatedSenderActivity);
            }

        } catch (activityError) {
            console.error('Error creating invitation response activities:', activityError);
        }

        // Populate the response
        const populatedInvitation = await Invitation.findById(invitationId)
            .populate('room', 'name')
            .populate('invitedBy', 'username email')
            .populate('invitedUser', 'username email');

        res.status(200).json({
            success: true,
            message: `Invitation ${response}ed successfully`,
            data: populatedInvitation
        });

    } catch (error) {
        console.error('Error responding to invitation:', error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get all invitations sent by the current user
const getSentInvitations = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query; // Optional filter by status

        let filter = {
            invitedBy: userId,
            expiresAt: { $gt: new Date() } // Only non-expired invitations
        };
        if (status) {
            filter.status = status;
        }

        const invitations = await Invitation.find(filter)
            .populate('room', 'name')
            .populate('invitedBy', 'username email')
            .populate('invitedUser', 'username email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: invitations
        });

    } catch (error) {
        console.error('Error getting sent invitations:', error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    sendInvitation,
    getUserInvitations,
    respondToInvitation,
    getSentInvitations
};
