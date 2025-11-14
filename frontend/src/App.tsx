// src/App.tsx
import React, { useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import AppRouter from './routes/AppRouter';
import useAuthStore from './store/authStore';
import { fetchCsrfToken } from './api/apiClient';
import theme from './theme/theme';

const App: React.FC = () => {
  const setCsrfToken = useAuthStore((state) => state.setCsrfToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

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
  }, [setCsrfToken, isAuthenticated]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppRouter />
    </ThemeProvider>
  );
};

export default App;