// src/components/BroadcastPanel.tsx
import React, { useEffect } from 'react';
import { Drawer, Box, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';
import useBroadcastStore from '../store/broadcastStore';
import apiClient from '../api/apiClient';

const BroadcastPanel: React.FC = () => {
  const { messages, isPanelOpen, togglePanel, markAllAsRead } = useBroadcastStore();

  // Mark broadcasts as read when panel is opened
  useEffect(() => {
    if (isPanelOpen && messages.length > 0) {
      const markBroadcastsAsRead = async () => {
        try {
          // Mark all unread broadcasts as read
          for (const msg of messages) {
            await apiClient.put(`/messages/${msg._id}/read`);
          }
          markAllAsRead();
        } catch (error) {
          console.error('Failed to mark broadcasts as read:', error);
        }
      };
      
      markBroadcastsAsRead();
    }
  }, [isPanelOpen, messages, markAllAsRead]);

  return (
    <Drawer anchor="right" open={isPanelOpen} onClose={togglePanel}>
      <Box sx={{ width: 320, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Broadcasts & Announcements
        </Typography>
        <Divider />
        <List>
          {messages.length === 0 ? (
            <ListItem>
              <ListItemText primary="No announcements yet." />
            </ListItem>
          ) : (
            messages.map((msg) => (
              <ListItem key={msg._id} alignItems="flex-start">
                <ListItemText
                  primary={msg.content}
                  secondary={`— Admin @ ${new Date(msg.createdAt).toLocaleString()}`}
                />
              </ListItem>
            ))
          )}
        </List>
      </Box>
    </Drawer>
  );
};

export default BroadcastPanel;