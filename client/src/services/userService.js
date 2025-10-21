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

// Send invitation to a user for a room
export const sendInvitation = async (roomId, invitedUserEmail, message) => {
  try {
    const response = await api.post('/api/invitations/send', {
      roomId,
      invitedUserEmail,
      message
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to send invitation:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Get invitations received by the current user
export const getUserInvitations = async (status = null) => {
  try {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/api/invitations/received${params}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to get user invitations:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Get invitations sent by the current user
export const getSentInvitations = async (status = null) => {
  try {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/api/invitations/sent${params}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to get sent invitations:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};

// Respond to an invitation (accept or decline)
export const respondToInvitation = async (invitationId, response) => {
  try {
    const apiResponse = await api.post('/api/invitations/respond', {
      invitationId,
      response
    });
    return { success: true, data: apiResponse.data };
  } catch (error) {
    console.error('Failed to respond to invitation:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
};
