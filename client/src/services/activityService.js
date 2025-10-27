import api from '../utils/axiosConfig';

/**
 * Activity Service - Centralized API calls for activity operations
 */

// Get activities with optional filters
export const getActivities = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/api/activities?${queryString}` : '/api/activities';
    const response = await api.get(url);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to get activities:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Get activities for a specific room
export const getRoomActivities = async (roomId, params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString 
      ? `/api/rooms/${roomId}/activities?${queryString}` 
      : `/api/rooms/${roomId}/activities`;
    const response = await api.get(url);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to get room activities:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};
