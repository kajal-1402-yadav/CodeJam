const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userActivityDeletedSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  deletedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index to ensure one deleted record per user per activity
userActivityDeletedSchema.index({ user: 1, activity: 1 }, { unique: true });

module.exports = mongoose.model('UserActivityDeleted', userActivityDeletedSchema);
