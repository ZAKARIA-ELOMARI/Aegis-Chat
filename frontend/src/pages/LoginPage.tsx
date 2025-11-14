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
    <Box className="login-page">
      {/* Floating background shapes */}
      <div className="floating-shapes">
        <div className="floating-shape"></div>
        <div className="floating-shape"></div>
        <div className="floating-shape"></div>
        <div className="floating-shape"></div>
      </div>
      
      <Container maxWidth="sm" className="login-container">
        <Box className="login-card">
          <Box className="login-header">
            <Typography className="login-title">
              Welcome to Aegis Chat
            </Typography>
            <Typography className="login-subtitle">
              Secure messaging with end-to-end encryption
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" className="error-alert">
              {error}
            </Alert>
          )}

          {/* Conditionally render either the login form or the 2FA form */}
          {!twoFactorRequired ? (
            // --- Original Login Form ---
            <Box component="form" onSubmit={handleLoginSubmit} className="login-form">
              <Box className="form-field">
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
              </Box>
              
              <Box className="form-field">
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
              </Box>

              <Button 
                type="submit" 
                fullWidth 
                variant="contained" 
                className="login-button"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
            </Box>
          ) : (
            // --- NEW 2FA Form ---
            <Box className="two-factor-section">
              <Typography variant="h6" className="two-factor-title">
                Two-Factor Authentication
              </Typography>
              <Typography className="two-factor-description">
                Enter the code from your authenticator app.
              </Typography>
              
              <Box component="form" onSubmit={handle2faSubmit} className="login-form">
                <Box className="form-field">
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
                </Box>

                <Button 
                  type="submit" 
                  fullWidth 
                  variant="contained" 
                  className="login-button"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Verify'}
                </Button>
                
                <Typography className="two-factor-description" sx={{ mt: 2 }}>
                  Lost access to your device? Please contact an administrator to have your 2FA reset.
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default LoginPage;
