import api from '../utils/axiosConfig';

/**
 * User Service - Centralized API calls for user operations
 */

// Get user profile
export const getUserProfile = async () => {
  try {
    const response = await api.get('/api/users/profile');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Update user profile
export const updateUserProfile = async (updates) => {
  try {
    const response = await api.put('/api/users/profile', updates);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Delete user account
export const deleteUserAccount = async () => {
  try {
    const response = await api.delete('/api/users/profile');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to delete user account:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};
