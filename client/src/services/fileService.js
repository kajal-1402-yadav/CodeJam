import api from '../utils/axiosConfig';

/**
 * File Service - Centralized API calls for file operations
 */

// Get all files in a room
export const getFilesByRoom = async (roomId) => {
  try {
    const response = await api.get(`/api/rooms/${roomId}/files`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to get files:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Get a specific file by ID
export const getFileById = async (roomId, fileId) => {
  try {
    const response = await api.get(`/api/rooms/${roomId}/files/${fileId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to get file:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Create a new file
export const createFile = async (roomId, fileData) => {
  try {
    const response = await api.post(`/api/rooms/${roomId}/files`, fileData);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to create file:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Update file content or metadata
export const updateFile = async (roomId, fileId, updates) => {
  try {
    const response = await api.put(`/api/rooms/${roomId}/files/${fileId}`, updates);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to update file:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Get files uploaded by current user across all rooms
export const getMyFiles = async () => {
  try {
    const response = await api.get('/api/files/my-files');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to get user files:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};
