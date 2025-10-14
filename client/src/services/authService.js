import api from '../utils/axiosConfig';

/**
 * Auth Service - Centralized API calls for authentication
 */

// Login user
export const loginUser = async (identifier, password) => {
  try {
    const response = await api.post('/api/auth/login', { identifier, password });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to login:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || error.message 
    };
  }
};

// Signup user
export const signupUser = async (username, email, password) => {
  try {
    const response = await api.post('/api/auth/signup', { username, email, password });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to signup:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || error.message 
    };
  }
};
