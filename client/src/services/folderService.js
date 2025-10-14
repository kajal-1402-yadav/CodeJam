import api from '../utils/axiosConfig';

/**
 * Folder Service - Centralized API calls for folder operations
 */

// Get all folders in a room
export const getFoldersByRoom = async (roomId) => {
  try {
    const response = await api.get(`/api/rooms/${roomId}/folders`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to get folders:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Create a new folder
export const createFolder = async (roomId, folderData) => {
  try {
    const response = await api.post(`/api/rooms/${roomId}/folders`, folderData);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to create folder:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Update folder name
export const updateFolder = async (roomId, folderId, updates) => {
  try {
    const response = await api.put(`/api/rooms/${roomId}/folders/${folderId}`, updates);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to update folder:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Delete a folder
export const deleteFolder = async (roomId, folderId) => {
  try {
    const response = await api.delete(`/api/rooms/${roomId}/folders/${folderId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to delete folder:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};
