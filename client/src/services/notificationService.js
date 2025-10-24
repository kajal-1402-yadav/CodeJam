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

// Get pending invitations for the current user
export const getPendingInvitations = async () => {
  try {
    const response = await api.get('/api/invitations/received?status=pending');
    // Backend returns {success: true, data: invitationsArray}
    // So we need to return the data array, not wrap it again
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Failed to get pending invitations:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Accept invitation from notification
export const acceptInvitationFromNotification = async (invitationId) => {
  try {
    const response = await api.post('/api/invitations/respond', {
      invitationId,
      response: 'accept'
    });
    // Backend returns {success: true, data: invitationData}
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Failed to accept invitation:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Decline invitation from notification
export const declineInvitationFromNotification = async (invitationId) => {
  try {
    const response = await api.post('/api/invitations/respond', {
      invitationId,
      response: 'decline'
    });
    // Backend returns {success: true, data: invitationData}
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Failed to decline invitation:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Helper function to transform activity data into notification format
export const transformActivityToNotification = (activity) => {
  // Only transform activities that should be notifications
  const shouldBeNotification = [
    // Both Activity + Notifications - Important events for both record and alerts
    'file_created',
    'file_deleted',
    'file_renamed',
    'user_joined',
    'user_left',
    'room_created',
    'room_deleted',
    // Notification Only (Alerts) - Actionable items that need user attention
    'invitation_sent',
    'invitation_accepted',
    'invitation_declined'
  ].includes(activity.type);

  if (!shouldBeNotification) {
    return null; // Skip activity-only items
  }

  // Determine the notification category for UI filtering
  const getNotificationCategory = (activityType) => {
    if (activityType?.includes('invitation')) {
      // Only invitation_sent activities are actionable invitations
      // invitation_accepted and invitation_declined are system activities
      if (activityType === 'invitation_sent') {
        return 'invitation';
      }
      return 'system'; // invitation_accepted, invitation_declined go to system
    }
    // Map activity types to notification categories
    switch (activityType) {
      case 'file_created':
      case 'file_deleted':
      case 'file_renamed':
        return 'file';
      case 'user_joined':
      case 'user_left':
      case 'room_created':
      case 'room_deleted':
        return 'room';
      default:
        return 'system';
    }
  };

  const getNotificationTitle = (activityType, metadata) => {
    switch (activityType) {
      case 'file_created':
        return 'File Created';
      case 'file_deleted':
        return 'File Deleted';
      case 'file_renamed':
        return 'File Renamed';
      case 'user_joined':
        return 'User Joined';
      case 'user_left':
        return 'User Left';
      case 'room_created':
        return 'Room Created';
      case 'room_deleted':
        return 'Room Deleted';
      case 'invitation_sent':
        return 'Invitation Received';
      case 'invitation_accepted':
        return 'Invitation Response';
      case 'invitation_declined':
        return 'Invitation Response';
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
      case 'file_deleted':
        return `${userName} deleted "${metadata?.filename || 'file'}" from ${metadata?.roomName || 'room'}`;
      case 'file_renamed':
        return `${userName} renamed "${metadata?.oldName || 'file'}" to "${metadata?.filename || 'new file'}" in ${metadata?.roomName || 'room'}`;
      case 'user_joined':
        return `${userName} joined room "${metadata?.roomName || 'room'}"`;
      case 'user_left':
        return `${userName} left room "${metadata?.roomName || 'room'}"`;
      case 'room_created':
        return `${userName} created room "${metadata?.roomName || 'room'}"`;
      case 'room_deleted':
        return `${userName} deleted room "${metadata?.roomName || 'room'}"`;
      case 'invitation_sent':
        // For invitation_sent, the activity.user is the person who received the invitation
        // We need to get the sender's name from the metadata
        const senderName = metadata?.invitedByName || 'Someone';
        return `${senderName} sent you an invitation to join "${metadata?.roomName || 'room'}"`;
      case 'invitation_accepted':
        return `${userName} accepted an invitation to join "${metadata?.roomName || 'room'}"`;
      case 'invitation_declined':
        return `${userName} declined an invitation to join "${metadata?.roomName || 'room'}"`;
      default:
        return description || 'Activity occurred';
    }
  };

  return {
    id: activity._id,
    type: getNotificationCategory(activity.type), // Return category for UI filtering
    title: getNotificationTitle(activity.type, activity.metadata),
    message: formatMessage(activity),
    timestamp: activity.createdAt,
    isRead: activity.isRead || false, // Use actual read status from server
    activityData: activity // Keep original activity data for reference
  };
};
