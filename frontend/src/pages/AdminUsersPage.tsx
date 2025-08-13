// src/pages/AdminUsersPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Switch, Box, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, TextField, Alert,
} from '@mui/material';
import apiClient from '../api/apiClient';
import type { User } from '../types/user';

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  // State for the password reset dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // NEW: State for the create user dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get<User[]>('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (user: User) => {
    const newStatus = user.status === 'active' ? 'deactivated' : 'active';
    try {
      await apiClient.put(`/admin/users/${user._id}/status`, { status: newStatus });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error(`Failed to update status for user ${user.username}:`, error);
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      const response = await apiClient.post(`/admin/users/${user._id}/reset-password`);
      setSelectedUser(user);
      setTempPassword(response.data.tempPassword);
      setResetDialogOpen(true);
    } catch (error) {
      console.error(`Failed to reset password for user ${user.username}:`, error);
    }
  };

  // NEW: Handler to create a new user
  const handleCreateUser = async () => {
    setCreateUserError(null);
    try {
      const response = await apiClient.post('/admin/users', { username: newUsername, email: newEmail });

      // Use the password reset dialog to show the new temp password
      setSelectedUser(response.data.user);
      setTempPassword(response.data.tempPassword);
      setCreateDialogOpen(false); // Close the creation dialog
      setResetDialogOpen(true);   // Open the results dialog
      fetchUsers(); // Refresh user list
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setCreateUserError(error.response?.data?.message || 'Failed to create user.');
    }
  };

  return (
    <Container maxWidth="lg">
      {/* NEW: Added a Box to hold the header and button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 2 }}>
        <Typography variant="h4">User Management</Typography>
        <Button variant="contained" onClick={() => setCreateDialogOpen(true)}>
          Create New User
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Active</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.status}</TableCell>
                <TableCell align="center">
                  <Switch
                    checked={user.status === 'active'}
                    onChange={() => handleStatusChange(user)}
                    disabled={user.status === 'pending'}
                  />
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={() => handleResetPassword(user)}
                  >
                    Reset Password
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog for showing temporary password (reused for create and reset) */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Action Successful</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please provide user <strong>{selectedUser?.username}</strong> with their new temporary password:
          </DialogContentText>
          <Box sx={{ p: 2, my: 2, bgcolor: 'grey.200', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" component="pre">{tempPassword}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* NEW: Dialog for creating a new user */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter the details for the new employee. They will be created with a temporary password.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="username"
            label="Username"
            type="text"
            fullWidth
            variant="standard"
            onChange={(e) => setNewUsername(e.target.value)}
          />
          <TextField
            margin="dense"
            id="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="standard"
            onChange={(e) => setNewEmail(e.target.value)}
          />
          {createUserError && <Alert severity="error" sx={{ mt: 2 }}>{createUserError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser}>Create</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminUsersPage;