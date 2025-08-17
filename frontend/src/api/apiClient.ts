// src/api/apiClient.ts
import axios from 'axios';
import useAuthStore from '../store/authStore'; // Import the store

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
});

// Add a request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const { accessToken, csrfToken } = useAuthStore.getState(); // Get tokens from the store
    
    // Add Authorization header if token exists
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // Add CSRF token for state-changing methods
    if (config.method === 'post' || config.method === 'put' || config.method === 'delete') {
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Function to fetch CSRF token
export const fetchCsrfToken = async (): Promise<string> => {
  try {
    const response = await apiClient.get('/csrf-token');
    return response.data.csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw error;
  }
};

export default apiClient;