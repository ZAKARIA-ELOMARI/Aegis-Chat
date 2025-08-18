// src/pages/AdminRolesPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Box, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, TextField, Alert,
  Chip, IconButton, Tooltip, FormControlLabel, Checkbox, FormGroup
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import apiClient from '../api/apiClient';
import type { Role } from '../types/user';

const AVAILABLE_PERMISSIONS = [
  'CREATE_USER',
  'DELETE_USER',
  'DEACTIVATE_USER',
  'RESET_USER_PASSWORD',
  'VIEW_SYSTEM_LOGS',
  'BROADCAST_MESSAGE',
  'MANAGE_ROLES'
];

const AdminRolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);

  // State for create/edit role dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [roleError, setRoleError] = useState<string | null>(null);

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const fetchRoles = async () => {
    try {
      const response = await apiClient.get<Role[]>('/admin/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleName('');
    setSelectedPermissions([]);
    setRoleError(null);
    setRoleDialogOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setSelectedPermissions(role.permissions);
    setRoleError(null);
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    setRoleError(null);
    
    if (!roleName.trim()) {
      setRoleError('Role name is required.');
      return;
    }

    try {
      if (editingRole) {
        // Update existing role
        await apiClient.put(`/admin/roles/${editingRole._id}`, {
          name: roleName,
          permissions: selectedPermissions
        });
      } else {
        // Create new role
        await apiClient.post('/admin/roles', {
          name: roleName,
          permissions: selectedPermissions
        });
      }
      
      setRoleDialogOpen(false);
      fetchRoles(); // Refresh the list
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setRoleError(error.response?.data?.message || 'Failed to save role.');
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    
    try {
      await apiClient.delete(`/admin/roles/${roleToDelete._id}`);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      fetchRoles(); // Refresh the list
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error(`Failed to delete role ${roleToDelete.name}:`, error.response?.data?.message || error);
    }
  };

  const openDeleteDialog = (role: Role) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions([...selectedPermissions, permission]);
    } else {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 2 }}>
        <Typography variant="h4">Role Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateRole}>
          Create New Role
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Role Name</TableCell>
              <TableCell>Permissions</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role._id}>
                <TableCell>
                  <Typography variant="h6">{role.name}</Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {role.permissions.map((permission) => (
                      <Chip 
                        key={permission} 
                        label={permission.replace('_', ' ')} 
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                    {role.permissions.length === 0 && (
                      <Typography variant="body2" color="textSecondary">
                        No permissions assigned
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Tooltip title="Edit Role">
                      <IconButton
                        color="primary"
                        onClick={() => handleEditRole(role)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Role">
                      <IconButton
                        color="error"
                        onClick={() => openDeleteDialog(role)}
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

      {/* Dialog for creating/editing a role */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRole ? 'Edit Role' : 'Create New Role'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {editingRole 
              ? 'Modify the role name and permissions.' 
              : 'Enter the details for the new role and select permissions.'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="roleName"
            label="Role Name"
            type="text"
            fullWidth
            variant="standard"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
          />
          
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Permissions</Typography>
          <FormGroup>
            {AVAILABLE_PERMISSIONS.map((permission) => (
              <FormControlLabel
                key={permission}
                control={
                  <Checkbox
                    checked={selectedPermissions.includes(permission)}
                    onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                  />
                }
                label={permission.replace(/_/g, ' ')}
              />
            ))}
          </FormGroup>
          
          {roleError && <Alert severity="error" sx={{ mt: 2 }}>{roleError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveRole}>
            {editingRole ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for confirming role deletion */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the role <strong>{roleToDelete?.name}</strong>? 
            This action cannot be undone. Make sure no users are assigned to this role first.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteRole} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminRolesPage;
