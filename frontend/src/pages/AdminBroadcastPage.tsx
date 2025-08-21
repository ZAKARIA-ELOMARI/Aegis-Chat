// src/pages/AdminBroadcastPage.tsx
import React, { useState } from 'react';
import {
  Typography, Paper, Box, TextField, Button, Alert, CircularProgress,
} from '@mui/material';
import apiClient from '../api/apiClient';
import useAuthStore from '../store/authStore';

const AdminBroadcastPage: React.FC = () => {
  const { role } = useAuthStore();
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send broadcast.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box className="admin-page">
      <Box className="admin-page-header">
        <Typography className="admin-page-title">
          📢 Broadcast Message
        </Typography>
        <Typography className="admin-page-subtitle">
          Send a message to all users in the system
        </Typography>
        {role !== 'Super Admin' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Your current role: {role}. You need 'Super Admin' role to access this page.
          </Alert>
        )}
      </Box>

      <Box className="admin-page-content">
        <Paper className="admin-card">
          <Box className="admin-card-header">
            <Typography className="admin-card-title">
              🎯 Compose Broadcast Message
            </Typography>
            <Typography className="admin-card-description">
              This message will be sent to all users currently online and stored for offline users.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleBroadcast} className="admin-form">
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Broadcast Message"
              placeholder="Type your message to all users here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isLoading}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                },
              }}
            />

            <Box className="admin-actions">
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading || !content.trim()}
                className="admin-button-primary"
                sx={{ minWidth: 200 }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Sending...
                  </>
                ) : (
                  '📤 Send Broadcast'
                )}
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => setContent('')}
                disabled={isLoading}
                className="admin-button-secondary"
              >
                🗑️ Clear
              </Button>
            </Box>
          </Box>
        </Paper>

        <Paper className="admin-card">
          <Box className="admin-card-header">
            <Typography className="admin-card-title">
              💡 Broadcast Guidelines
            </Typography>
          </Box>
          
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Alert severity="info">
              <strong>Best Practices:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Keep messages clear and concise</li>
                <li>Use appropriate tone for your audience</li>
                <li>Include relevant links or contact information if needed</li>
                <li>Consider time zones when sending urgent messages</li>
              </ul>
            </Alert>
            
            <Alert severity="warning">
              <strong>Remember:</strong> Broadcast messages are visible to all users and cannot be edited once sent.
            </Alert>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminBroadcastPage;