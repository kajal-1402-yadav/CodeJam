const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userActivityReadSchema = new Schema({
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
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Compound index to ensure one read status per user per activity
userActivityReadSchema.index({ user: 1, activity: 1 }, { unique: true });

module.exports = mongoose.model('UserActivityRead', userActivityReadSchema);
