// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import apiClient from '../api/apiClient';
import useAuthStore from '../store/authStore';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  sub: string;
  isTwoFactorEnabled: boolean; // Add this
  role: string; // Add this
}

// --- NEW: Define a type for the expected API error structure ---
// This provides type safety for the error object caught from the API client.
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const LoginPage: React.FC = () => {
  // --- Existing State ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // --- NEW State for 2FA Flow ---
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState('');

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      // --- THIS IS THE NEW LOGIC ---
      if (response.data.initialPasswordSetupRequired) {
        // Redirect to the new page, passing the tempToken and email
        navigate('/set-initial-password', {
          state: { tempToken: response.data.tempToken, email: email },
        });
      // --- END NEW LOGIC ---
      } else if (response.data.twoFactorRequired) {
        setTwoFactorRequired(true);
        setTempToken(response.data.tempToken);
      } else {
        // If no 2FA, login is complete
        const { accessToken } = response.data;
        const decodedToken: DecodedToken = jwtDecode(accessToken);
        login(accessToken, decodedToken.sub, decodedToken.isTwoFactorEnabled, decodedToken.role);
        navigate('/dashboard');
      }
    } catch (err) {
      // Use the specific ApiError type instead of 'any'
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Handler for submitting the 2FA token
  const handle2faSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post(
        '/auth/2fa/verify-login',
        { token: twoFactorToken },
        { headers: { Authorization: `Bearer ${tempToken}` } } // Authenticate with the temp token
      );

      // On success, we get the final access token
      const { accessToken } = response.data;
      const decodedToken: DecodedToken = jwtDecode(accessToken);
      login(accessToken, decodedToken.sub, decodedToken.isTwoFactorEnabled, decodedToken.role);
      navigate('/dashboard');

    } catch (err) {
      // Use the specific ApiError type instead of 'any'
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || 'Invalid 2FA token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Aegis Chat Login
        </Typography>

        {/* Conditionally render either the login form or the 2FA form */}
        {!twoFactorRequired ? (
          // --- Original Login Form ---
          <Box component="form" onSubmit={handleLoginSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </Box>
        ) : (
          // --- NEW 2FA Form ---
          <Box component="form" onSubmit={handle2faSubmit} sx={{ mt: 3 }}>
            <Typography sx={{ mb: 2 }}>Enter the code from your authenticator app.</Typography>
            <TextField
              margin="normal"
              required
              fullWidth
              name="2fa-token"
              label="6-Digit Code"
              id="2fa-token"
              autoFocus
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken(e.target.value)}
            />
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Verify'}
            </Button>
            {/* ADD THIS HELPER TEXT */}
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              Lost access to your device? Please contact an administrator to have your 2FA reset.
            </Typography>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{error}</Alert>}

      </Box>
    </Container>
  );
};

export default LoginPage;
