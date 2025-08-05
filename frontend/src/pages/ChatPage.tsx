// src/pages/ChatPage.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import ChatWindow from '../components/ChatWindow';
import useUserStore from '../store/userStore';

const ChatPage: React.FC = () => {
  const selectedUser = useUserStore((state) => state.selectedUser);

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {selectedUser ? (
        <ChatWindow />
      ) : (
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h5" color="text.secondary">
            Select a user to start chatting
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ChatPage;