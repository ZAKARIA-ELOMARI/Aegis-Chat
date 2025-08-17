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
  Badge,
  IconButton,
  styled,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SecurityIcon from '@mui/icons-material/Security';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CampaignIcon from '@mui/icons-material/Campaign';
import apiClient from '../api/apiClient';
import useUserStore from '../store/userStore';
import useAuthStore from '../store/authStore';
import useBroadcastStore from '../store/broadcastStore';
import BroadcastPanel from '../components/BroadcastPanel';
import type { User } from '../types/user';
import { getSocket } from '../api/socketClient';
import type { Message } from '../types/message';
import { getKeys, decryptMessage } from '../utils/crypto'; // ADD THIS LINE


// NEW: Create a styled component for our online indicator dot
const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

const drawerWidth = 240;

const MainLayout: React.FC = () => {
  const { users, setUsers, setSelectedUser, setOnlineUsers, setTypingUser } = useUserStore();
  const { logout, userId: currentUserId, accessToken, role } = useAuthStore(); // Add role
  const { setMessages: setBroadcasts, addMessage: addBroadcast } = useBroadcastStore();
  const toggleBroadcastPanel = useBroadcastStore((state) => state.togglePanel);
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
    // Fetch historical broadcasts on load
    const fetchBroadcasts = async () => {
      try {
        const response = await apiClient.get('/messages/broadcasts');
        setBroadcasts(response.data);
      } catch (error) {
        console.error('Failed to fetch broadcasts:', error);
      }
    };
    fetchBroadcasts();
  }, [setBroadcasts]);

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket(accessToken);

    const handlePrivateMessage = (newMessage: { content: string, senderId: string }) => {
        // Get the LATEST state directly from the stores inside the handler
        const { users, selectedUser, addMessage } = useUserStore.getState();
        const { userId: currentUserId } = useAuthStore.getState();

        // Only process the message if the chat with the sender is currently open
        if (selectedUser && newMessage.senderId === selectedUser._id) {
            
            // --- START E2EE DECRYPTION LOGIC ---

            // 1. Get the current user's (the receiver's) keys.
            const myKeys = getKeys();
            // 2. Find the sender's full user object to get their public key.
            const sender = users.find(u => u._id === newMessage.senderId);

            // 3. CRITICAL CHECK: Ensure we have all keys needed for decryption.
            if (!myKeys || !myKeys.secretKey || !sender || !sender.publicKey) {
                console.error("Cannot decrypt message. Cryptographic keys are missing.");
                // Optionally, display an error message in the chat window
                addMessage({
                    _id: new Date().toISOString(),
                    sender: newMessage.senderId,
                    recipient: currentUserId!,
                    content: "[Could not decrypt message: Keys unavailable]",
                    createdAt: new Date().toISOString(),
                });
                return;
            }

            // 4. Decrypt the message content using our utility function.
            const decryptedContent = decryptMessage(
                newMessage.content,
                sender.publicKey,
                myKeys.secretKey
            );

            // --- END E2EE DECRYPTION LOGIC ---

            const messagePayload: Message = {
                _id: new Date().toISOString(),
                content: decryptedContent || "[Decryption Failed]", // 5. Use decrypted content
                sender: newMessage.senderId,
                recipient: currentUserId!,
                createdAt: new Date().toISOString(),
            };

            // Call the action to add the now-decrypted message to the UI
            addMessage(messagePayload);
        } else {
            // This part handles notifications for inactive chats
            console.log(`Received message from ${newMessage.senderId}, but their chat is not active.`);
        }
    };

    // NEW: Listen for the online user list
    socket.on('updateOnlineUsers', (onlineUserIds: string[]) => {
      setOnlineUsers(onlineUserIds);
    });

    // NEW: Listen for typing indicators
    socket.on('typing', ({ senderId, isTyping }) => {
      setTypingUser(isTyping ? senderId : null);
    });

    // NEW: Listen for broadcast messages
    const handleBroadcastMessage = (data: { content: string, sender: string, timestamp: string }) => {
      console.log('New broadcast received!', data);
      // Add the new broadcast to our store
      addBroadcast({
        _id: data.timestamp, // Use timestamp as a temporary key
        content: data.content,
        sender: data.sender,
        recipient: '', // Not applicable
        createdAt: data.timestamp,
      });
    };

    socket.on('connect', () => console.log('Socket connected:', socket.id));
    socket.on('disconnect', () => console.log('Socket disconnected'));
    socket.on('privateMessage', handlePrivateMessage);
    socket.on('broadcastMessage', handleBroadcastMessage);

    // Cleanup function to remove the listener when the component unmounts
    return () => {
        socket.off('privateMessage', handlePrivateMessage);
        socket.off('updateOnlineUsers'); // NEW: Cleanup listener
        socket.off('typing'); // NEW: Cleanup listener
        socket.off('broadcastMessage', handleBroadcastMessage); // Cleanup the new listener
        socket.off('connect');
        socket.off('disconnect');
    };
}, [accessToken, setOnlineUsers, setTypingUser, addBroadcast]); // Add dependencies

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

  // Get the list of online users from the store for rendering
  const onlineUsers = useUserStore((state) => state.onlineUsers);

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
          {/* Button to open the broadcast panel */}
          <IconButton color="inherit" onClick={toggleBroadcastPanel}>
            <CampaignIcon />
          </IconButton>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      {/* Add the broadcast panel component */}
      <BroadcastPanel />
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
              <>
                <ListItem key="admin-users" disablePadding>
                  <ListItemButton onClick={() => navigate('/admin/users')}>
                    <ListItemIcon>
                      <AdminPanelSettingsIcon />
                    </ListItemIcon>
                    <ListItemText primary="User Management" />
                  </ListItemButton>
                </ListItem>
                {/* NEW LINK FOR LOGS */}
                <ListItem key="admin-logs" disablePadding>
                  <ListItemButton onClick={() => navigate('/admin/logs')}>
                    <ListItemIcon>
                      <ListAltIcon />
                    </ListItemIcon>
                    <ListItemText primary="System Logs" />
                  </ListItemButton>
                </ListItem>
                {/* NEW LINK FOR BROADCAST */}
                <ListItem key="admin-broadcast" disablePadding>
                  <ListItemButton onClick={() => navigate('/admin/broadcast')}>
                    <ListItemIcon>
                      <CampaignIcon />
                    </ListItemIcon>
                    <ListItemText primary="Broadcast Message" />
                  </ListItemButton>
                </ListItem>
              </>
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
                    {/* NEW: Conditionally render the online badge */}
                    {onlineUsers.includes(user._id) ? (
                      <StyledBadge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        variant="dot"
                      >
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                      </StyledBadge>
                    ) : (
                      <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                        <PersonIcon fontSize="small" />
                      </Avatar>
                    )}
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