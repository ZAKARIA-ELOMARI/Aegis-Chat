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
    const { accessToken } = useAuthStore.getState(); // Get token from the store
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;