// src/pages/AdminUsersPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Switch, Box, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle,
} from '@mui/material';
import apiClient from '../api/apiClient';
import type { User } from '../types/user';

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

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
      setDialogOpen(true);
    } catch (error) {
      console.error(`Failed to reset password for user ${user.username}:`, error);
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ my: 2 }}>User Management</Typography>
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

      {/* Dialog for showing temporary password */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Password Reset</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The password for user <strong>{selectedUser?.username}</strong> has been reset.
            Please provide them with this new temporary password:
          </DialogContentText>
          <Box sx={{ p: 2, my: 2, bgcolor: 'grey.200', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" component="pre">{tempPassword}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminUsersPage;