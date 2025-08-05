// src/layouts/MainLayout.tsx
import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Button,
  Divider,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SecurityIcon from '@mui/icons-material/Security';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import apiClient from '../api/apiClient';
import useUserStore from '../store/userStore';
import useAuthStore from '../store/authStore';
import type { User } from '../types/user';
import { getSocket } from '../api/socketClient';
import type { Message } from '../types/message';

const drawerWidth = 240;

const MainLayout: React.FC = () => {
  const { users, setUsers, setSelectedUser } = useUserStore();
  const { logout, userId: currentUserId, accessToken, role } = useAuthStore(); // Add role
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get('/users');
        setUsers(response.data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, [setUsers]);

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket(accessToken);

    const handlePrivateMessage = (newMessage: { content: string, senderId: string }) => {
        // Get the LATEST state directly from the store inside the handler
        const { selectedUser } = useUserStore.getState();

        // Only add the message to the state if the chat with the sender is currently open
        if (selectedUser && newMessage.senderId === selectedUser._id) {
            const currentUserId = useAuthStore.getState().userId;

            const messagePayload: Message = {
                _id: new Date().toISOString(),
                content: newMessage.content,
                sender: newMessage.senderId,
                recipient: currentUserId!,
                createdAt: new Date().toISOString(),
            };

            // Call the action directly from the store's state
            useUserStore.getState().addMessage(messagePayload);
        } else {
            // Optional: Here you could implement a notification for a new message
            // from a user whose chat window is not open.
            console.log(`Received message from ${newMessage.senderId}, but their chat is not active.`);
        }
    };

    socket.on('connect', () => console.log('Socket connected:', socket.id));
    socket.on('disconnect', () => console.log('Socket disconnected'));
    socket.on('privateMessage', handlePrivateMessage);

    // Cleanup function to remove the listener when the component unmounts
    return () => {
        socket.off('privateMessage', handlePrivateMessage);
        socket.off('connect');
        socket.off('disconnect');
    };
}, [accessToken]); // This effect should only re-run if the user's token changes (login/logout)

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  // Filter the users list to exclude the current user
  const filteredUsers = users.filter(user => user._id !== currentUserId);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    navigate('/chat'); // Navigate to a general chat page
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Aegis Chat
          </Typography>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {/* NEW: Conditionally render Admin Panel Link */}
            {role === 'Super Admin' && (
              <ListItem key="admin-users" disablePadding>
                <ListItemButton onClick={() => navigate('/admin/users')}>
                  <ListItemIcon>
                    <AdminPanelSettingsIcon />
                  </ListItemIcon>
                  <ListItemText primary="Admin Panel" />
                </ListItemButton>
              </ListItem>
            )}
            {/* NEW AI ASSISTANT LINK */}
            <ListItem key="ai-assistant" disablePadding>
              <ListItemButton onClick={() => navigate('/assistant')}>
                <ListItemIcon>
                  <PsychologyIcon />
                </ListItemIcon>
                <ListItemText primary="AI Assistant" />
              </ListItemButton>
            </ListItem>
            {/* NEW SECURITY PAGE LINK */}
            <ListItem key="security" disablePadding>
              <ListItemButton onClick={() => navigate('/security')}>
                <ListItemIcon>
                  <SecurityIcon />
                </ListItemIcon>
                <ListItemText primary="Security" />
              </ListItemButton>
            </ListItem>
            <Divider /> {/* SEPARATOR */}
            <Typography variant="subtitle1" sx={{ pl: 2, pt: 1, pb: 1 }}>Employees</Typography>
            {/* Use the filteredUsers array here */}
            {filteredUsers.map((user) => (
              <ListItem key={user._id} disablePadding>
                {/* Add onClick handler to the button */}
                <ListItemButton onClick={() => handleSelectUser(user)}>
                  <ListItemIcon>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                      <PersonIcon fontSize="small" />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText primary={user.username} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet /> {/* Child routes (like the chat window) will render here */}
      </Box>
    </Box>
  );
};

export default MainLayout;