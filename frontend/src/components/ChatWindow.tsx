// src/components/ChatWindow.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Box, TextField, Button, Paper, Typography, IconButton } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import useUserStore from '../store/userStore';
import useAuthStore from '../store/authStore';
import apiClient from '../api/apiClient';
import { getSocket } from '../api/socketClient';

const ChatWindow: React.FC = () => {
  const { selectedUser, messages, setMessages, addMessage, typingUser } = useUserStore();
  const { userId: currentUserId, accessToken } = useAuthStore();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedUser) {
      const fetchHistory = async () => {
        try {
          const response = await apiClient.get(`/messages/${selectedUser._id}`);
          setMessages(response.data);
        } catch (error) {
          console.error('Failed to fetch message history:', error);
        }
      };
      fetchHistory();
    }
  }, [selectedUser, setMessages]);

  // Function to handle when a file is selected
  // Function to handle when a file is selected
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewMessage(`File: ${e.target.files[0].name}`);
    }
  };
  // Handler for input changes to emit typing events
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!selectedUser || !accessToken) return;
    const socket = getSocket(accessToken);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit('typing', { recipientId: selectedUser._id, isTyping: true });

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { recipientId: selectedUser._id, isTyping: false });
    }, 1500);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !selectedUser || !accessToken || !currentUserId) {
        return;
    }

    try {
        const socket = getSocket(accessToken);
        const messageData = {
            senderId: currentUserId,
            recipientId: selectedUser._id,
            content: newMessage,
        };

        socket.emit('privateMessage', messageData);

        addMessage({
            _id: new Date().toISOString(),
            sender: currentUserId,
            recipient: selectedUser._id,
            content: newMessage,
            createdAt: new Date().toISOString(),
        });

        setNewMessage('');
    } catch (error) {
        console.error('Failed to send message:', error);
    }
  };

  if (!selectedUser) return null;

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid #ddd' }}>
        Chat with {selectedUser.username}
      </Typography>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}>
        {messages.map((msg) => {
          // Check if the message content is a file URL from our MinIO server
          const isFileUrl = msg.content.includes(import.meta.env.VITE_MINIO_ENDPOINT_URL);
          const fileName = isFileUrl ? msg.content.split('/').pop() : '';

          const handleFileClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              if (!fileName) return;

              try {
                  const response = await apiClient.get(`/files/access/${fileName}`);
                  const presignedUrl = response.data.url;
                  window.open(presignedUrl, '_blank');
              } catch (error) {
                  console.error("Could not get secure link for file", error);
                  alert("Error: Could not access file.");
              }
          };

          return (
            <Paper
              key={msg._id}
              sx={{
                p: 1.5,
                mb: 1,
                maxWidth: '70%',
                alignSelf: msg.sender === currentUserId ? 'flex-end' : 'flex-start',
                bgcolor: msg.sender === currentUserId ? 'primary.main' : 'grey.300',
                color: msg.sender === currentUserId ? 'primary.contrastText' : 'text.primary',
                ml: msg.sender === currentUserId ? 'auto' : 0,
                mr: msg.sender !== currentUserId ? 'auto' : 0,
                wordBreak: 'break-word',
              }}
            >
              {isFileUrl ? (
                <a href={msg.content} onClick={handleFileClick} style={{ color: 'inherit', textDecoration: 'underline' }}>
                  {fileName}
                </a>
              ) : (
                <Typography variant="body1">{msg.content}</Typography>
              )}
            </Paper>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>

      {/* Typing indicator */}
      <Box sx={{ height: '24px', px: 2, fontStyle: 'italic' }}>
        {typingUser === selectedUser?._id && (
          <Typography variant="body2" color="text.secondary">
            {selectedUser.username} is typing...
          </Typography>
        )}
      </Box>

      <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, borderTop: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".jpg, .jpeg, .png, .pdf"
        />
        <IconButton onClick={() => fileInputRef.current?.click()}>
          <AttachFileIcon />
        </IconButton>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type a message or attach a file..."
          value={newMessage}
          onChange={handleInputChange}
        />
        <Button type="submit" variant="contained" sx={{ ml: 1 }}>
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default ChatWindow;