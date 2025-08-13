// src/pages/AdminBroadcastPage.tsx
import React, { useState } from 'react';
import {
  Container, Typography, Paper, Box, TextField, Button, Alert, CircularProgress,
} from '@mui/material';
import apiClient from '../api/apiClient';

const AdminBroadcastPage: React.FC = () => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Broadcast content cannot be empty.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post('/admin/broadcast', { content });
      setSuccess('Broadcast message sent successfully!');
      setContent(''); // Clear the input field on success
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send broadcast.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ my: 2 }}>Send Broadcast Message</Typography>
      <Paper sx={{ p: 3 }}>
        <Typography sx={{ mb: 2 }}>
          This message will be sent in real-time to all currently online users. It will also be saved for historical records.
        </Typography>
        <Box component="form" onSubmit={handleBroadcast}>
          <TextField
            label="Broadcast Message"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Send Broadcast'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AdminBroadcastPage;