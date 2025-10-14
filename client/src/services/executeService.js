import api from '../utils/axiosConfig';

/**
 * Execute Service - Centralized API calls for code execution
 */

// Execute code
export const executeCode = async (payload) => {
  try {
    const response = await api.post('/api/execute', payload);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Failed to execute code:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || error.message,
      details: error.response?.data?.details,
      status: error.response?.status
    };
  }
};
