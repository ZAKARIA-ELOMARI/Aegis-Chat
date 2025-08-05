// src/pages/SetInitialPasswordPage.tsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Box, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import apiClient from '../api/apiClient';

// Define a type for the expected API error structure for type safety.
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const SetInitialPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // State for success message
  const [loading, setLoading] = useState(false); // State for loading indicator
  const navigate = useNavigate();
  const location = useLocation();
  const { tempToken, email } = location.state || {}; // Get data passed from login page

  // If essential data from the previous page is missing, render an error message.
  if (!tempToken || !email) {
    return (
      <Container maxWidth="xs" sx={{ mt: 8, textAlign: 'center' }}>
        <Alert severity="error">Invalid session. Please try logging in again.</Alert>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/login')}>
          Back to Login
        </Button>
      </Container>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      await apiClient.post(
        '/auth/set-initial-password',
        { email, newPassword }, // The 'tempPassword' field was unused and has been removed.
        { headers: { Authorization: `Bearer ${tempToken}` } }
      );
      // On success, display a message and then redirect the user.
      setSuccessMessage('Password successfully set! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000); // Wait 2 seconds before redirecting
    } catch (err) {
      // Use the specific ApiError type instead of 'any' for better type safety.
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || 'Failed to set password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">Set Your New Password</Typography>
        <Typography sx={{ mt: 1, textAlign: 'center' }}>
          Please choose a new, secure password for your account.
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            name="newPassword"
            label="New Password"
            type="password"
            id="newPassword"
            autoFocus
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading || !!successMessage} // Disable field when loading or on success
          />
          {error && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{error}</Alert>}
          {successMessage && <Alert severity="success" sx={{ width: '100%', mt: 2 }}>{successMessage}</Alert>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !!successMessage} // Disable button when loading or on success
          >
            {loading ? <CircularProgress size={24} /> : 'Set Password and Log In'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default SetInitialPasswordPage;
