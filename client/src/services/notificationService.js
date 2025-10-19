import api from '../utils/axiosConfig';

/**
 * Notification Service - Centralized API calls for notifications
 */

// Get all notifications for the current user
export const getNotifications = async (limit = 50, page = 1) => {
  try {
    const response = await api.get(`/api/notifications?limit=${limit}&page=${page}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Get notifications by type
export const getNotificationsByType = async (type, limit = 50, page = 1) => {
  try {
    const response = await api.get(`/api/notifications?type=${type}&limit=${limit}&page=${page}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to get notifications by type:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await api.patch(`/api/notifications/${notificationId}/read`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await api.patch('/api/notifications/mark-all-read');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Delete a notification
export const deleteNotification = async (notificationId) => {
  try {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Clear all notifications
export const clearAllNotifications = async () => {
  try {
    const response = await api.delete('/api/notifications');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to clear all notifications:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Helper function to transform activity data into notification format
export const transformActivityToNotification = (activity) => {
  const getNotificationType = (activityType) => {
    switch (activityType) {
      case 'file_created':
      case 'file_edited':
      case 'file_deleted':
      case 'file_renamed':
        return 'file';
      case 'message_sent':
        return 'message';
      case 'room_created':
      case 'room_updated':
      case 'room_deleted':
      case 'user_joined':
      case 'user_left':
        return 'room';
      case 'code_executed':
        return 'system';
      default:
        return 'system';
    }
  };

  const getNotificationTitle = (activityType, metadata) => {
    switch (activityType) {
      case 'file_created':
        return 'File Created';
      case 'file_edited':
        return 'File Updated';
      case 'file_deleted':
        return 'File Deleted';
      case 'file_renamed':
        return 'File Renamed';
      case 'message_sent':
        return 'New Message';
      case 'code_executed':
        return 'Code Executed';
      case 'room_created':
        return 'Room Created';
      case 'room_updated':
        return 'Room Updated';
      case 'room_deleted':
        return 'Room Deleted';
      case 'user_joined':
        return 'User Joined';
      case 'user_left':
        return 'User Left';
      default:
        return 'Activity';
    }
  };

  const formatMessage = (activity) => {
    const { type, description, metadata } = activity;
    const userName = activity.user?.username || 'User';

    switch (type) {
      case 'file_created':
        return `${userName} uploaded "${metadata?.filename || 'file'}" to ${metadata?.roomName || 'room'}`;
      case 'file_edited':
        return `${userName} edited "${metadata?.filename || 'file'}" in ${metadata?.roomName || 'room'}`;
      case 'file_deleted':
        return `${userName} deleted "${metadata?.filename || 'file'}" from ${metadata?.roomName || 'room'}`;
      case 'file_renamed':
        return `${userName} renamed "${metadata?.oldName || 'file'}" to "${metadata?.filename || 'new file'}" in ${metadata?.roomName || 'room'}`;
      case 'message_sent':
        return `${userName} sent a message in "${metadata?.roomName || 'room'}"`;
      case 'code_executed':
        return `${userName} executed code "${metadata?.filename || 'script'}" in ${metadata?.roomName || 'room'}`;
      case 'room_created':
        return `${userName} created room "${metadata?.roomName || 'room'}"`;
      case 'room_updated':
        return `${userName} updated room "${metadata?.roomName || 'room'}"`;
      case 'room_deleted':
        return `${userName} deleted room "${metadata?.roomName || 'room'}"`;
      case 'user_joined':
        return `${userName} joined room "${metadata?.roomName || 'room'}"`;
      case 'user_left':
        return `${userName} left room "${metadata?.roomName || 'room'}"`;
      default:
        return description || 'Activity occurred';
    }
  };

  return {
    id: activity._id,
    type: getNotificationType(activity.type),
    title: getNotificationTitle(activity.type, activity.metadata),
    message: formatMessage(activity),
    timestamp: activity.createdAt,
    isRead: false, // Activities are always unread initially
    activityData: activity // Keep original activity data for reference
  };
};
