const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const activitySchema = new Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
        // Permanent activities (stored in database)
        'file_created',
        'file_edited',
        'file_deleted',
        'file_renamed',
        'message_sent',
        'code_executed',
        'room_created',
        'room_updated',
        'room_deleted',
        'invitation_sent',
        'invitation_accepted',
        'invitation_declined',
        // Temporary activities (real-time only, not stored)
        'user_joined',
        'user_left',
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

activitySchema.index({ room: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });

// Add compound index to prevent duplicate activities for similar events
activitySchema.index({
  room: 1,
  user: 1,
  type: 1,
  'metadata.filename': 1,
  'metadata.fileId': 1
}, {
  unique: false, // Allow multiple activities, but help with deduplication queries
  sparse: true
});

module.exports = mongoose.model('Activity', activitySchema);
