// src/pages/AdminLogsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Box, Button, CircularProgress, Alert, Chip,
} from '@mui/material';
import apiClient from '../api/apiClient';

// Define the shape of a log entry
interface LogEntry {
  _id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  meta?: any; // For any extra data
}

const AdminLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true); // To know if there are more pages

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // The backend defaults to a limit of 50, which is fine for our UI
        const response = await apiClient.get<LogEntry[]>(`/admin/logs?page=${page}&limit=50`);
        setLogs(response.data);
        // If we receive less than 50 logs, it's the last page
        if (response.data.length < 50) {
          setHasMore(false);
        }
      } catch (err) {
        setError('Failed to fetch system logs.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [page]);

  const getChipColor = (level: string) => {
    if (level === 'error') return 'error';
    if (level === 'warn') return 'warning';
    return 'info';
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ my: 2 }}>System Logs</Typography>
      {error && <Alert severity="error">{error}</Alert>}
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
          onClick={() => setPage(page - 1)}
          disabled={page === 1 || isLoading}
        >
          Previous
        </Button>
        <Typography>Page {page}</Typography>
        <Button
          variant="contained"
          onClick={() => setPage(page + 1)}
          disabled={!hasMore || isLoading}
        >
          Next
        </Button>
      </Box>
    </Container>
  );
};

export default AdminLogsPage;