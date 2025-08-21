import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  Alert,
  CircularProgress,
  Pagination,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Security,
  Warning,
  Error,
  Info,
  Refresh,
  FilterList,
  Search,
  TrendingUp,
  Shield
} from '@mui/icons-material';
import axios from 'axios';
import apiClient from '../api/apiClient';
import { getSocket } from '../api/socketClient';
import useAuthStore from '../store/authStore';

// INTERFACES for type safety
interface SecurityLog {
  id: string;
  timestamp: Date;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  location?: string;
  context: Record<string, unknown>;
  details: string;
}

interface SecurityStats {
  total: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byEventType: Record<string, number>;
  topSourceIPs: Array<{
    ip: string;
    count: number;
  }>;
  recentCriticalEvents: Array<{
    timestamp: Date;
    eventType: string;
    message: string;
    ip: string;
  }>;
}

const AdminSecurityAlertsPage: React.FC = () => {
  console.log('AdminSecurityAlertsPage component rendering...');
  
  // AUTH STORE
  const { accessToken } = useAuthStore();
  
  // COMPONENT STATE
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
  
  // State for filters
  const [filters, setFilters] = useState({
    severity: '',
    eventType: '',
    search: '',
    startDate: '',
    endDate: ''
  });

  // CONFIGURATION for styling and icons
  const severityColors: Record<SecurityLog['severity'], 'success' | 'warning' | 'error'> = {
    low: 'success',
    medium: 'warning',
    high: 'error',
    critical: 'error'
  };

  const severityIcons: Record<SecurityLog['severity'], React.ReactElement> = {
    low: <Info fontSize="small" />,
    medium: <Warning fontSize="small" />,
    high: <Error fontSize="small" />,
    critical: <Error fontSize="small" />
  };

  const eventTypeIcons: Record<string, React.ReactNode> = {
    'LOGIN_ATTEMPT': <Security fontSize="small" />,
    'LOGIN_SUCCESS': <Security fontSize="small" />,
    'LOGIN_FAILURE': <Security fontSize="small" />,
    'LOGOUT': <Security fontSize="small" />,
    'PASSWORD_CHANGE': <Shield fontSize="small" />,
    'ACCOUNT_LOCKED': <Security fontSize="small" />,
    '2FA_ENABLED': <Shield fontSize="small" />,
    '2FA_DISABLED': <Shield fontSize="small" />,
    '2FA_VERIFICATION': <Shield fontSize="small" />,
    'SESSION_TERMINATED': <Security fontSize="small" />,
    'PERMISSION_DENIED': <Security fontSize="small" />,
    'ADMIN_ACTION': <Security fontSize="small" />,
    'DATA_ACCESS': <Security fontSize="small" />,
    'SUSPICIOUS_ACTIVITY': <Warning fontSize="small" />
  };

  // DATA FETCHING LOGIC
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading security logs...');
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.eventType && { eventType: filters.eventType }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      // Real API call to get security logs
      console.log(`Making API call to: /admin/security-logs?${queryParams}`);
      const response = await apiClient.get(`/admin/security-logs?${queryParams}`);
      console.log('Security logs response:', response.data);
      
      setLogs(response.data.logs);
      setTotalPages(response.data.pagination.totalPages);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading security logs:', err);
      // FIX: Improved error handling to safely access error messages.
      // The original code produced a type error because `err.response.data` is not guaranteed
      // to have a `message` property. This version safely checks for it.
      let errorMessage = 'Failed to load security logs';
      if (axios.isAxiosError(err)) {
        console.error('Axios error details:', err.response?.data);
        const apiError = err.response?.data as { message?: string };
        errorMessage = apiError?.message || `Network error: ${err.message}`;
      } else if (err instanceof Error) {
        errorMessage = (err as Error).message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = String((err as { message: unknown }).message);
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const loadStats = useCallback(async () => {
    try {
      console.log('Loading security stats...');
      // Real API call to get security statistics
      const response = await apiClient.get('/admin/security-stats');
      console.log('Security stats response:', response.data);
      setStats(response.data.stats);
    } catch (err) {
      console.error('Failed to load security stats:', err);
    }
  }, []);

  // EFFECT to load data on component mount and when dependencies change
  useEffect(() => {
    console.log('AdminSecurityAlertsPage mounted, loading data...');
    console.log('Access token:', accessToken ? 'exists' : 'missing');
    loadLogs();
    loadStats();
  }, [loadLogs, loadStats, accessToken]);

  // EFFECT for real-time security events via Socket.IO
  useEffect(() => {
    if (!accessToken) return;
    
    const socket = getSocket(accessToken);
    
    const handleSecurityEvent = (event: SecurityLog) => {
      console.log('New security event received:', event);
      // Add new event to the beginning of the logs list
      setLogs(prevLogs => [event, ...prevLogs.slice(0, 19)]); // Keep only latest 20
      
      // Update stats by refetching them
      loadStats();
    };

    // Listen for real-time security events
    socket.on('securityEvent', handleSecurityEvent);

    return () => {
      socket.off('securityEvent', handleSecurityEvent);
    };
  }, [loadStats, accessToken]);

  // EVENT HANDLERS
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      severity: '',
      eventType: '',
      search: '',
      startDate: '',
      endDate: ''
    });
    setPage(1);
  };

  // UTILITY FUNCTIONS
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatEventType = (eventType: string) => {
    return eventType.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const getLocationDisplay = (log: SecurityLog) => {
    return log.location || log.ipAddress || 'Unknown';
  };

  // Function to clear all security logs
  const handleClearAllLogs = async () => {
    if (window.confirm('Are you sure you want to clear all security logs? This action cannot be undone.')) {
      try {
        await apiClient.delete('/admin/security-logs');
        setLogs([]);
        loadStats(); // Refresh stats
        console.log('Security logs cleared successfully');
      } catch (err) {
        console.error('Failed to clear security logs:', err);
        setError('Failed to clear security logs');
      }
    }
  };

  // Function to export logs to CSV
  const exportToCSV = () => {
    if (logs.length === 0) return;

    const headers = ['Timestamp', 'Event Type', 'Severity', 'User ID', 'IP Address', 'Location', 'Details'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        formatDate(log.timestamp),
        `"${formatEventType(log.eventType)}"`,
        log.severity.toUpperCase(),
        log.userId || 'Anonymous',
        log.ipAddress || 'Unknown',
        getLocationDisplay(log),
        `"${log.details.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `security-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // RENDER LOGIC
  if (loading && logs.length === 0 && !error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Security Alerts & Logs
        </Typography>
        <Box display="flex" gap={2}>
          <Button 
            variant="outlined" 
            startIcon={<FilterList />}
            onClick={exportToCSV}
            disabled={logs.length === 0}
          >
            Export CSV
          </Button>
          <Button 
            variant="outlined" 
            color="warning"
            onClick={handleClearAllLogs}
            disabled={logs.length === 0}
          >
            Clear All Alerts
          </Button>
          <IconButton onClick={() => { loadLogs(); loadStats(); }} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{stats.total}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Events</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Error color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{stats.bySeverity.critical + stats.bySeverity.high}</Typography>
                  <Typography variant="body2" color="text.secondary">High/Critical</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Warning color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{stats.bySeverity.medium}</Typography>
                  <Typography variant="body2" color="text.secondary">Medium Risk</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Info color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{stats.bySeverity.low}</Typography>
                  <Typography variant="body2" color="text.secondary">Low Risk</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
            Filters
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr 1fr' }, gap: 2 }}>
            <FormControl size="small">
              <InputLabel>Severity</InputLabel>
              <Select value={filters.severity} label="Severity" onChange={(e) => handleFilterChange('severity', e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>Event Type</InputLabel>
              <Select value={filters.eventType} label="Event Type" onChange={(e) => handleFilterChange('eventType', e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  {stats && Object.keys(stats.byEventType).map(type => (
                      <MenuItem key={type} value={type}>{formatEventType(type)}</MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField size="small" label="Search" value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}/>
            <TextField size="small" type="date" label="Start Date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} InputLabelProps={{ shrink: true }}/>
            <TextField size="small" type="date" label="End Date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} InputLabelProps={{ shrink: true }}/>
          </Box>
          <Box mt={2}>
            <Button onClick={clearFilters} variant="outlined" size="small">Clear Filters</Button>
          </Box>
        </CardContent>
      </Card>

      {/* Show logs table even if empty, with proper feedback */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Event Type</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? 'Loading security logs...' : 
                     error ? 'Failed to load logs' : 
                     'No security logs found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} hover onClick={() => setSelectedLog(log)} sx={{ cursor: 'pointer' }}>
                  <TableCell><Typography variant="body2">{formatDate(log.timestamp)}</Typography></TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {eventTypeIcons[log.eventType] || <Security fontSize="small" />}
                      <Typography variant="body2" sx={{ ml: 1 }}>{formatEventType(log.eventType)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color={severityColors[log.severity]} icon={severityIcons[log.severity]} label={log.severity.toUpperCase()}/>
                  </TableCell>
                  <TableCell><Typography variant="body2">{log.userId || 'Anonymous'}</Typography></TableCell>
                  <TableCell>
                    <Tooltip title={log.ipAddress || 'Unknown IP'}>
                      <Typography variant="body2">{getLocationDisplay(log)}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200, textOverflow: 'ellipsis' }}>{log.details}</Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination count={totalPages} page={page} onChange={(_, newPage) => setPage(newPage)} color="primary"/>
      </Box>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onClose={() => setSelectedLog(null)} maxWidth="md" fullWidth>
        {selectedLog && (
          <>
            <DialogTitle>Security Event Details</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 1 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Event Type</Typography>
                    <Typography variant="body1" gutterBottom>{formatEventType(selectedLog.eventType)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Severity</Typography>
                    <Box sx={{ mb: 2 }}>
                      <Chip color={severityColors[selectedLog.severity]} icon={severityIcons[selectedLog.severity]} label={selectedLog.severity.toUpperCase()}/>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Timestamp</Typography>
                    <Typography variant="body1" gutterBottom>{formatDate(selectedLog.timestamp)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">User ID</Typography>
                    <Typography variant="body1" gutterBottom>{selectedLog.userId || 'Anonymous'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">IP Address</Typography>
                    <Typography variant="body1" gutterBottom>{selectedLog.ipAddress || 'Unknown'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                    <Typography variant="body1" gutterBottom>{selectedLog.location || 'Unknown'}</Typography>
                  </Box>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">User Agent</Typography>
                  <Typography variant="body2" gutterBottom sx={{ wordBreak: 'break-all' }}>{selectedLog.userAgent || 'Unknown'}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Details</Typography>
                  <Typography variant="body1" gutterBottom>{selectedLog.details}</Typography>
                </Box>
                {selectedLog.context && Object.keys(selectedLog.context).length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Additional Context</Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 1 }}>
                      {Object.entries(selectedLog.context).map(([key, value]) => {
                        if (key === 'requestContext') return null; // Skip to avoid duplication
                        return (
                          <Box key={key} sx={{ mb: 1, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                            </Typography>
                            <Typography variant="body2" sx={{ ml: 1, wordBreak: 'break-word' }}>
                              {typeof value === 'object' && value !== null 
                                ? JSON.stringify(value, null, 2)
                                : String(value)}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Paper>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedLog(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AdminSecurityAlertsPage;
