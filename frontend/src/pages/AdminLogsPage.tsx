// src/pages/AdminLogsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Box, Button, CircularProgress, Alert, Chip,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  FormControlLabel, Switch, Stack
} from '@mui/material';
import apiClient from '../api/apiClient';

// Define the shape of a log entry
interface LogEntry {
  _id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  meta?: Record<string, unknown>; // For any extra data
}

const AdminLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true); // To know if there are more pages
  const [securityOnly, setSecurityOnly] = useState(true); // Filter for security events
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        securityOnly: securityOnly.toString()
      });
      const response = await apiClient.get<LogEntry[]>(`/admin/logs?${queryParams}`);
      setLogs(response.data);
      // If we receive less than 50 logs, it's the last page
      if (response.data.length < 50) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (err) {
      setError('Failed to fetch system logs.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, securityOnly]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getChipColor = (level: string) => {
    if (level === 'error') return 'error';
    if (level === 'warn') return 'warning';
    return 'info';
  };

  const handleClearLogs = async () => {
    setIsClearingLogs(true);
    try {
      const response = await apiClient.delete('/admin/logs');
      setLogs([]);
      setPage(1);
      setHasMore(false);
      setClearDialogOpen(false);
      setSuccessMessage(`Successfully cleared ${response.data.deletedCount} log entries.`);
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
      // Refetch logs instead of reloading the page
      await fetchLogs();
    } catch (err) {
      setError('Failed to clear logs.');
      console.error(err);
    } finally {
      setIsClearingLogs(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setHasMore(true); // Reset hasMore when changing pages
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ my: 2 }}>System Logs</Typography>
      
      {/* Controls */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={securityOnly}
                onChange={(e) => {
                  setSecurityOnly(e.target.checked);
                  setPage(1); // Reset to first page when filter changes
                }}
              />
            }
            label="Security Events Only"
          />
        </Stack>
        
        <Button
          variant="contained"
          color="error"
          onClick={() => setClearDialogOpen(true)}
          disabled={isLoading || logs.length === 0}
        >
          Clear All Logs
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {successMessage && <Alert severity="success">{successMessage}</Alert>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '25%' }}>Timestamp</TableCell>
              <TableCell sx={{ width: '10%' }}>Level</TableCell>
              <TableCell>Message</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip label={log.level} color={getChipColor(log.level)} size="small" />
                  </TableCell>
                  <TableCell sx={{ wordBreak: 'break-all' }}>{log.message}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button
          variant="contained"
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1 || isLoading}
        >
          Previous
        </Button>
        <Typography>Page {page}</Typography>
        <Button
          variant="contained"
          onClick={() => handlePageChange(page + 1)}
          disabled={!hasMore || isLoading}
        >
          Next
        </Button>
      </Box>

      {/* Clear Logs Confirmation Dialog */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
      >
        <DialogTitle>Clear All System Logs</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to clear all system logs? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleClearLogs} 
            color="error" 
            variant="contained"
            disabled={isClearingLogs}
          >
            {isClearingLogs ? <CircularProgress size={20} /> : 'Clear All Logs'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminLogsPage;