import api from './axiosConfig';

/**
 * Activity API - Handles room activity tracking and history
 */

export const ACTIVITY_TYPES = {
  FILE_CREATED: 'file_created',
  FILE_EDITED: 'file_edited',
  FILE_DELETED: 'file_deleted',
  FILE_RENAMED: 'file_renamed',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  MESSAGE_SENT: 'message_sent',
  CODE_EXECUTED: 'code_executed',
  ROOM_CREATED: 'room_created',
  ROOM_DELETED: 'room_deleted',
  ROOM_UPDATED: 'room_updated'
};

// Create a new activity
export const createActivity = async (roomId, type, metadata = {}) => {
  try {
    const response = await api.post(`/api/rooms/${roomId}/activities`, {
      type,
      metadata
    });
    return response.data;
  } catch (error) {
    console.error('Error creating activity:', error);
    throw error;
  }
};

// Get activities for a specific room with pagination and optional type filter
export const getRoomActivities = async (roomId, options = {}) => {
  try {
    const { limit = 50, page = 1, type } = options;
    const params = { limit, page };
    if (type) params.type = type;

    const response = await api.get(`/api/rooms/${roomId}/activities`, { params });
    return response.data; // { activities, total, page, pages }
  } catch (error) {
    console.error('Error fetching room activities:', error);
    throw error;
  }
};

// Get activities for all rooms the user has access to with pagination and optional type filter
export const getAllActivities = async (options = {}) => {
  try {
    const { limit = 10, page = 1, type } = options;
    const params = { limit, page };
    if (type) params.type = type;

    const response = await api.get('/api/activities', { params });
    return response.data; // { activities, total, page, pages }
  } catch (error) {
    console.error('Error fetching all activities:', error);
    throw error;
  }
};

// Admin cleanup of old activities
export const cleanupOldActivities = async () => {
  try {
    const response = await api.delete('/api/activities/cleanup');
    return response.data;
  } catch (error) {
    console.error('Error cleaning up activities:', error);
    throw error;
  }
};

// Helper functions for convenience
export const createFileActivity = async (roomId, type, filename, metadata = {}) =>
  createActivity(roomId, type, { filename, ...metadata });

export const createUserActivity = async (roomId, type, metadata = {}) =>
  createActivity(roomId, type, metadata);

export const createRoomActivity = async (roomId, type, metadata = {}) =>
  createActivity(roomId, type, metadata);
