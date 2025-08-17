// src/App.tsx
import React, { useEffect } from 'react';
import AppRouter from './routes/AppRouter';
import useAuthStore from './store/authStore';
import { fetchCsrfToken } from './api/apiClient';

const App: React.FC = () => {
  const setCsrfToken = useAuthStore((state) => state.setCsrfToken);

  useEffect(() => {
    // Fetch CSRF token when the app loads
    const initializeCsrfToken = async () => {
      try {
        const token = await fetchCsrfToken();
        setCsrfToken(token);
      } catch (error) {
        console.error('Failed to initialize CSRF token:', error);
      }
    };

    initializeCsrfToken();
  }, [setCsrfToken]);

  return <AppRouter />;
};

export default App;