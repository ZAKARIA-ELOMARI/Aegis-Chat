// src/pages/SecurityPage.tsx
import React, { useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import useAuthStore from '../store/authStore'; // Import the auth store
import apiClient from '../api/apiClient';

const SecurityPage: React.FC = () => {
  // Get the 2FA status from our global store
  const { isTwoFactorEnabled, login, accessToken, userId } = useAuthStore();

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.post('/2fa/generate');
      setQrCode(response.data.qrCodeUrl);
    } catch {
      setError('Failed to generate QR code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post('/2fa/verify', { token });
      setSuccess('Two-Factor Authentication has been enabled successfully!');
      setQrCode(null);
      // Manually update the state in the store after successful verification
      if (accessToken && userId) {
        login(accessToken, userId, true);
      }
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Verification failed.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" gutterBottom>
          Two-Factor Authentication (2FA)
        </Typography>

        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* --- NEW Conditional Rendering --- */}
        {isTwoFactorEnabled ? (
          <Alert severity="info">Two-Factor Authentication is already active on your account.</Alert>
        ) : (
          <>
            {!qrCode ? (
              <Box>
                <Typography sx={{ mb: 2 }}>
                  Enhance your account's security by enabling 2FA.
                </Typography>
                <Button variant="contained" onClick={handleGenerate} disabled={isLoading}>
                  {isLoading ? <CircularProgress size={24} /> : 'Enable 2FA'}
                </Button>
              </Box>
            ) : (
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography sx={{ mb: 1 }}>1. Scan this QR code with your authenticator app.</Typography>
                <img src={qrCode} alt="2FA QR Code" />
                <Typography sx={{ mt: 2, mb: 1 }}>2. Enter the 6-digit code to verify.</Typography>
                <TextField
                  label="Verification Code"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  sx={{ mt: 1, mb: 2 }}
                />
                <Button variant="contained" color="primary" onClick={handleVerify} disabled={isLoading}>
                  {isLoading ? <CircularProgress size={24} /> : 'Verify & Enable'}
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default SecurityPage;