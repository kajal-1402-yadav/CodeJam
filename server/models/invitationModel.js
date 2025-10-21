const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const invitationSchema = new Schema({
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    invitedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'expired'],
        default: 'pending'
    },
    message: {
        type: String,
        maxlength: 500
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    }
}, { timestamps: true });

// Index for efficient queries
invitationSchema.index({ room: 1, invitedUser: 1 }, { unique: true }); // Prevent duplicate invitations
invitationSchema.index({ invitedUser: 1, status: 1 }); // For user's pending invitations
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired invitations

module.exports = mongoose.model('Invitation', invitationSchema);
