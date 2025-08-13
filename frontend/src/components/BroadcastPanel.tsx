// src/components/BroadcastPanel.tsx
import React from 'react';
import { Drawer, Box, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';
import useBroadcastStore from '../store/broadcastStore';

const BroadcastPanel: React.FC = () => {
  const { messages, isPanelOpen, togglePanel } = useBroadcastStore();

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