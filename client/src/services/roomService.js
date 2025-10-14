import api from '../utils/axiosConfig';

/**
 * Room Service - Centralized API calls for room operations
 */

// Get room details by ID
export const getRoomById = async (roomId) => {
  try {
    const response = await api.get(`/api/rooms/${roomId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to get room:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Get all rooms for the current user
export const getAllRooms = async () => {
  try {
    const response = await api.get('/api/rooms');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to get rooms:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Create a new room
export const createRoom = async (roomData) => {
  try {
    const response = await api.post('/api/rooms', roomData);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to create room:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Update room details
export const updateRoom = async (roomId, updates) => {
  try {
    const response = await api.put(`/api/rooms/${roomId}`, updates);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to update room:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Delete a room
export const deleteRoom = async (roomId) => {
  try {
    const response = await api.delete(`/api/rooms/${roomId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to delete room:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};
