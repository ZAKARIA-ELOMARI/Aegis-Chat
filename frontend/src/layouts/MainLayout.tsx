// src/layouts/MainLayout.tsx
import React, { useEffect, useState } from 'react';
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
  IconButton,
  Badge,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SecurityIcon from '@mui/icons-material/Security';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CampaignIcon from '@mui/icons-material/Campaign';
import apiClient from '../api/apiClient';
import useUserStore from '../store/userStore';
import useAuthStore from '../store/authStore';
import useBroadcastStore from '../store/broadcastStore';
import BroadcastPanel from '../components/BroadcastPanel';
import AdminDropdown from '../components/AdminDropdown';
import type { User } from '../types/user';
import { getSocket } from '../api/socketClient';
import type { Message } from '../types/message';
import { getKeys, decryptMessage } from '../utils/crypto'; // ADD THIS LINE

const MainLayout: React.FC = () => {
  const { users, setUsers, setSelectedUser, setOnlineUsers, setTypingUser, unreadCounts, setUnreadCount } = useUserStore();
  const { logout, userId: currentUserId, accessToken, role } = useAuthStore(); // Add role
  const { setMessages: setBroadcasts, addMessage: addBroadcast, unreadCount: broadcastUnreadCount, setUnreadCount: setBroadcastUnreadCount } = useBroadcastStore();
  const toggleBroadcastPanel = useBroadcastStore((state) => state.togglePanel);
  const navigate = useNavigate();
  
  // State for admin dropdown
  const [adminAnchorEl, setAdminAnchorEl] = useState<null | HTMLElement>(null);
  const adminDropdownOpen = Boolean(adminAnchorEl);

  const handleAdminClick = (event: React.MouseEvent<HTMLElement>) => {
    setAdminAnchorEl(event.currentTarget);
  };

  const handleAdminClose = () => {
    setAdminAnchorEl(null);
  };

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
    // Fetch unread counts
    const fetchUnreadCounts = async () => {
      try {
        const [unreadResponse, broadcastResponse] = await Promise.all([
          apiClient.get('/messages/unread-counts'),
          apiClient.get('/messages/unread-broadcasts')
        ]);
        
        // Set unread counts for individual users
        const counts = unreadResponse.data;
        Object.entries(counts).forEach(([userId, count]) => {
          setUnreadCount(userId, count as number);
        });

        // Set unread broadcast count
        setBroadcastUnreadCount(broadcastResponse.data.count);
      } catch (error) {
        console.error('Failed to fetch unread counts:', error);
      }
    };

    if (accessToken) {
      fetchUnreadCounts();
    }
  }, [accessToken, setUnreadCount, setBroadcastUnreadCount]);

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
        const { users, selectedUser, addMessage, incrementUnreadCount } = useUserStore.getState();
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
            // Increment unread count for this user
            incrementUnreadCount(newMessage.senderId);
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

    // Listen for read receipt events
    socket.on('messageDelivered', ({ messageId, deliveredAt }) => {
      console.log(`Message ${messageId} delivered at ${deliveredAt}`);
      // Update message status in the store if needed
    });

    socket.on('messageRead', ({ messageId, readAt }) => {
      console.log(`Message ${messageId} read at ${readAt}`);
      // Update message status in the store if needed
    });

    // Cleanup function to remove the listener when the component unmounts
    return () => {
        socket.off('privateMessage', handlePrivateMessage);
        socket.off('updateOnlineUsers'); // NEW: Cleanup listener
        socket.off('typing'); // NEW: Cleanup listener
        socket.off('broadcastMessage', handleBroadcastMessage); // Cleanup the new listener
        socket.off('messageDelivered');
        socket.off('messageRead');
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
    <Box className="main-layout">
      <CssBaseline />
      <AppBar
        position="fixed"
        className="app-bar"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }} className="app-bar-title">
            🛡️ Aegis Chat
          </Typography>
          
          {/* Broadcast Panel Toggle Button */}
          <Badge 
            badgeContent={broadcastUnreadCount} 
            color="error" 
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: '#ff6b35',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                animation: broadcastUnreadCount > 0 ? 'bounce 1s infinite alternate' : 'none',
              }
            }}
          >
            <IconButton 
              color="inherit" 
              onClick={toggleBroadcastPanel}
              sx={{ 
                mr: 2,
                background: 'rgba(66, 51, 43, 0.08)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '10px',
                color: 'var(--color-potters-clay)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                '&:hover': {
                  background: 'rgba(66, 51, 43, 0.12)',
                  transform: 'translateY(-1px)',
                  boxShadow: 'var(--shadow-md)'
                }
              }}
            >
              <CampaignIcon />
            </IconButton>
          </Badge>
          
          <Button 
            color="inherit" 
            onClick={handleLogout}
            sx={{ 
              background: 'rgba(66, 51, 43, 0.08)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              px: 3,
              py: 1.25,
              color: 'var(--color-potters-clay)',
              fontWeight: 600,
              fontSize: '0.9rem',
              textTransform: 'none',
              letterSpacing: '0.02em',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              '&:hover': {
                background: 'rgba(66, 51, 43, 0.12)',
                transform: 'translateY(-1px)',
                boxShadow: 'var(--shadow-md)'
              }
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      {/* Add the broadcast panel component */}
      <BroadcastPanel />
      
      {/* Add the admin dropdown */}
      {role === 'Super Admin' && (
        <AdminDropdown
          anchorEl={adminAnchorEl}
          open={adminDropdownOpen}
          onClose={handleAdminClose}
        />
      )}
      
      <Drawer
        variant="permanent"
        className="drawer"
        classes={{
          paper: 'drawer-paper',
        }}
      >
        <Toolbar />
        <Box className="drawer-content">
          {/* User Profile Section */}
          <Box className="user-profile-section">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar className="user-avatar">
                {currentUserId?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Welcome back!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {role}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Navigation Section */}
          <Box sx={{ flex: '0 0 auto' }}>
            <List className="navigation-list">
              {/* Home/Dashboard Link */}
              <ListItem className="nav-list-item" disablePadding>
                <ListItemButton 
                  onClick={() => navigate('/dashboard')}
                  className="nav-list-button"
                >
                  <ListItemIcon className="nav-list-icon">
                    🏠
                  </ListItemIcon>
                  <ListItemText 
                    primary="Dashboard" 
                    classes={{ primary: 'nav-list-text' }}
                  />
                </ListItemButton>
              </ListItem>

              <ListItem className="nav-list-item" disablePadding>
                <ListItemButton 
                  onClick={() => navigate('/assistant')}
                  className="nav-list-button"
                >
                  <ListItemIcon className="nav-list-icon">
                    <PsychologyIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="AI Assistant" 
                    classes={{ primary: 'nav-list-text' }}
                  />
                </ListItemButton>
              </ListItem>
              
              <ListItem className="nav-list-item" disablePadding>
                <ListItemButton 
                  onClick={() => navigate('/security')}
                  className="nav-list-button"
                >
                  <ListItemIcon className="nav-list-icon">
                    <SecurityIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Security" 
                    classes={{ primary: 'nav-list-text' }}
                  />
                </ListItemButton>
              </ListItem>

              {/* Admin Panel Links - Only for Super Admin - Compact version */}
              {role === 'Super Admin' && (
                <>
                  <ListItem className="nav-list-item" disablePadding>
                    <ListItemButton 
                      onClick={handleAdminClick}
                      className="nav-list-button"
                    >
                      <ListItemIcon className="nav-list-icon">
                        <AdminPanelSettingsIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Admin Panel" 
                        classes={{ primary: 'nav-list-text' }}
                      />
                    </ListItemButton>
                  </ListItem>
                </>
              )}
            </List>
          </Box>

          {/* Users Section - Takes remaining space */}
          <Box className="users-section" sx={{ flex: '1 1 auto', minHeight: 0 }}>
            <Box sx={{ 
              borderTop: '1px solid var(--color-seashell-dark)', 
              pt: 2,
              mx: 2
            }}>
              <Typography className="users-section-title">
                💬 Team Members ({filteredUsers.length} online)
              </Typography>
            </Box>
            <Box className="users-list-container" sx={{ overflowY: 'auto', height: '100%' }}>
              {/* Use the filteredUsers array here */}
              {filteredUsers.map((user) => (
                <ListItem key={user._id} className="user-list-item" disablePadding>
                  <ListItemButton 
                    onClick={() => handleSelectUser(user)}
                    className="user-list-button"
                  >
                    <ListItemIcon>
                      <Badge 
                        badgeContent={unreadCounts[user._id] || 0} 
                        color="error"
                        sx={{
                          '& .MuiBadge-badge': {
                            backgroundColor: '#ff4444',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                            minWidth: '16px',
                            height: '16px',
                            animation: (unreadCounts[user._id] || 0) > 0 ? 'pulse 2s infinite' : 'none',
                          }
                        }}
                      >
                        {/* NEW: Conditionally render the online badge */}
                        {onlineUsers.includes(user._id) ? (
                          <Box className="online-badge">
                            <Avatar className="user-avatar-small">
                              {user.username.charAt(0).toUpperCase()}
                            </Avatar>
                          </Box>
                        ) : (
                          <Avatar className="user-avatar-small">
                            {user.username.charAt(0).toUpperCase()}
                          </Avatar>
                        )}
                      </Badge>
                    </ListItemIcon>
                    <ListItemText 
                      primary={user.username} 
                      classes={{ primary: 'user-list-text' }}
                      secondary={onlineUsers.includes(user._id) ? "Online" : "Offline"}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
              {filteredUsers.length === 0 && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No team members available
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Drawer>
      
      <Box component="main" className="main-content">
        <Toolbar />
        <Box className="content-container">
          <Outlet /> {/* Child routes (like the chat window) will render here */}
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;