// src/pages/AdminUsersPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Switch, Box, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, TextField, Alert,
  Select, MenuItem, FormControl, InputLabel, Chip, IconButton, Tooltip
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import apiClient from '../api/apiClient';
import type { User, Role } from '../types/user';

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // State for the password reset dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // State for the create user dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // State for role change dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [userToChangeRole, setUserToChangeRole] = useState<User | null>(null);
  const [newRoleId, setNewRoleId] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get<User[]>('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await apiClient.get<Role[]>('/admin/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
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

  const handleCreateUser = async () => {
    setCreateUserError(null);
    try {
      const response = await apiClient.post('/admin/users', { 
        username: newUsername, 
        email: newEmail,
        roleId: selectedRoleId || undefined
      });

      // Use the password reset dialog to show the new temp password
      setSelectedUser(response.data.user);
      setTempPassword(response.data.tempPassword);
      setCreateDialogOpen(false); // Close the creation dialog
      setResetDialogOpen(true);   // Open the results dialog
      
      // Reset form
      setNewUsername('');
      setNewEmail('');
      setSelectedRoleId('');
      
      fetchUsers(); // Refresh user list
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setCreateUserError(error.response?.data?.message || 'Failed to create user.');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await apiClient.delete(`/admin/users/${userToDelete._id}`);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error(`Failed to delete user ${userToDelete.username}:`, error);
    }
  };

  const handleChangeRole = async () => {
    if (!userToChangeRole || !newRoleId) return;
    
    try {
      await apiClient.put(`/admin/users/${userToChangeRole._id}/role`, { roleId: newRoleId });
      setRoleDialogOpen(false);
      setUserToChangeRole(null);
      setNewRoleId('');
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error(`Failed to change role for user ${userToChangeRole.username}:`, error);
    }
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const openRoleDialog = (user: User) => {
    setUserToChangeRole(user);
    setNewRoleId(user.role._id);
    setRoleDialogOpen(true);
  };

  return (
    <Container maxWidth="lg">
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
              <TableCell>Role</TableCell>
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
                <TableCell>
                  <Chip 
                    label={user.role?.name || 'No Role'} 
                    color={user.role?.name === 'Super Admin' ? 'error' : 'primary'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{user.status}</TableCell>
                <TableCell align="center">
                  <Switch
                    checked={user.status === 'active'}
                    onChange={() => handleStatusChange(user)}
                    disabled={user.status === 'pending'}
                  />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      onClick={() => handleResetPassword(user)}
                    >
                      Reset Password
                    </Button>
                    <Tooltip title="Change Role">
                      <IconButton
                        color="primary"
                        onClick={() => openRoleDialog(user)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete User">
                      <IconButton
                        color="error"
                        onClick={() => openDeleteDialog(user)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
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

      {/* Dialog for creating a new user */}
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
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
          <TextField
            margin="dense"
            id="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="standard"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <FormControl fullWidth margin="dense" variant="standard">
            <InputLabel id="role-select-label">Role (Optional)</InputLabel>
            <Select
              labelId="role-select-label"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
            >
              <MenuItem value="">
                <em>Default (Employee)</em>
              </MenuItem>
              {roles.map((role) => (
                <MenuItem key={role._id} value={role._id}>
                  {role.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {createUserError && <Alert severity="error" sx={{ mt: 2 }}>{createUserError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for confirming user deletion */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete user <strong>{userToDelete?.username}</strong>? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for changing user role */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)}>
        <DialogTitle>Change User Role</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Change the role for user <strong>{userToChangeRole?.username}</strong>:
          </DialogContentText>
          <FormControl fullWidth margin="dense" variant="standard">
            <InputLabel id="new-role-select-label">Role</InputLabel>
            <Select
              labelId="new-role-select-label"
              value={newRoleId}
              onChange={(e) => setNewRoleId(e.target.value)}
            >
              {roles.map((role) => (
                <MenuItem key={role._id} value={role._id}>
                  {role.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleChangeRole}>Change Role</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminUsersPage;