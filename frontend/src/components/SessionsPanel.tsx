// src/components/SessionsPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Computer as ComputerIcon,
  Smartphone as SmartphoneIcon,
  Tablet as TabletIcon,
} from '@mui/icons-material';
import type { Session } from '../types/session';
import { getUserSessions, terminateSession, terminateAllOtherSessions } from '../api/sessionClient';

const SessionsPanel: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [terminating, setTerminating] = useState<string | null>(null);
  const [terminatingAll, setTerminatingAll] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    sessionId?: string;
    sessionDescription?: string;
    isTerminateAll?: boolean;
  }>({ open: false });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading sessions...'); // Debug log
      const response = await getUserSessions();
      console.log('Sessions response:', response); // Debug log
      setSessions(response.sessions);
    } catch (err: unknown) {
      console.error('Error loading sessions:', err); // Debug log
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load sessions';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      setTerminating(sessionId);
      setError(null);
      await terminateSession(sessionId);
      setSuccess('Session terminated successfully');
      setConfirmDialog({ open: false });
      // Remove the terminated session from the list
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to terminate session';
      setError(errorMessage);
    } finally {
      setTerminating(null);
    }
  };

  const handleTerminateAllOthers = async () => {
    try {
      setTerminatingAll(true);
      setError(null);
      const response = await terminateAllOtherSessions();
      setSuccess(response.message);
      setConfirmDialog({ open: false });
      // Keep only the current session
      setSessions(prev => prev.filter(s => s.isCurrent));
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to terminate sessions';
      setError(errorMessage);
    } finally {
      setTerminatingAll(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <SmartphoneIcon />;
      case 'tablet':
        return <TabletIcon />;
      default:
        return <ComputerIcon />;
    }
  };

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const otherSessions = sessions.filter(s => !s.isCurrent);
  const currentSession = sessions.find(s => s.isCurrent);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Active Sessions
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Monitor and manage all devices where you're currently logged in. You can remotely log out 
        of sessions you don't recognize for enhanced security.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {sessions.length === 0 ? (
        <Alert severity="info">
          No active sessions found. This might indicate a synchronization issue.
        </Alert>
      ) : (
        <>
          {/* Current Session */}
          {currentSession && (
            <Paper sx={{ mb: 2, p: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Current Session
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                {getDeviceIcon(currentSession.deviceInfo.device)}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1">
                    {currentSession.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentSession.ipAddress} • {formatLastActivity(currentSession.lastActivity)}
                  </Typography>
                  {currentSession.location.city !== 'Unknown' && (
                    <Typography variant="caption" color="text.secondary">
                      {currentSession.location.city}, {currentSession.location.country}
                    </Typography>
                  )}
                </Box>
                <Chip label="Current" color="primary" size="small" />
              </Box>
            </Paper>
          )}

          {/* Other Sessions */}
          {otherSessions.length > 0 ? (
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle2">
                  Other Sessions ({otherSessions.length})
                </Typography>
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={terminatingAll ? <CircularProgress size={16} /> : <LogoutIcon />}
                  onClick={() => setConfirmDialog({ open: true, isTerminateAll: true })}
                  disabled={terminatingAll}
                >
                  Log Out All Others
                </Button>
              </Box>
              <Divider sx={{ mb: 1 }} />
              <List>
                {otherSessions.map((session, index) => (
                  <ListItem key={session.id} divider={index < otherSessions.length - 1}>
                    <Box display="flex" alignItems="center" gap={2} sx={{ width: '100%' }}>
                      {getDeviceIcon(session.deviceInfo.device)}
                      <Box sx={{ flexGrow: 1 }}>
                        <ListItemText
                          primary={session.description}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {session.ipAddress} • {formatLastActivity(session.lastActivity)}
                              </Typography>
                              {session.location.city !== 'Unknown' && (
                                <Typography variant="caption" color="text.secondary">
                                  {session.location.city}, {session.location.country}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </Box>
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => setConfirmDialog({
                          open: true,
                          sessionId: session.id,
                          sessionDescription: session.description
                        })}
                        disabled={terminating === session.id}
                        size="small"
                      >
                        {terminating === session.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <LogoutIcon />
                        )}
                      </IconButton>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>No other sessions found.</strong>
                  <br />
                  You're only logged in from this device/browser. To test session management, 
                  try logging in from another browser or device, then return here to see and manage multiple sessions.
                </Typography>
              </Alert>
            </Paper>
          )}
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {confirmDialog.isTerminateAll ? 'Log Out All Other Sessions?' : 'Log Out Session?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.isTerminateAll ? (
              <>
                This will log you out of all other devices and sessions. You'll need to log in again 
                on those devices to continue using the application.
              </>
            ) : (
              <>
                Are you sure you want to log out of "{confirmDialog.sessionDescription}"? 
                This action cannot be undone and the user will need to log in again on that device.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false })}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (confirmDialog.isTerminateAll) {
                handleTerminateAllOthers();
              } else if (confirmDialog.sessionId) {
                handleTerminateSession(confirmDialog.sessionId);
              }
            }}
            color="error"
            variant="contained"
          >
            {confirmDialog.isTerminateAll ? 'Log Out All Others' : 'Log Out Session'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionsPanel;
