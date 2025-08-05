// src/components/ChatWindow.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Box, TextField, Button, Paper, Typography, IconButton, CircularProgress } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile'; // NEW: Import for the icon
import useUserStore from '../store/userStore';
import useAuthStore from '../store/authStore';
import apiClient from '../api/apiClient';
import { getSocket } from '../api/socketClient';

const ChatWindow: React.FC = () => {
  const { selectedUser, messages, setMessages, addMessage } = useUserStore();
  const currentUserId = useAuthStore((state) => state.userId);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null); // NEW: State for the selected file
  const [isUploading, setIsUploading] = useState(false); // NEW: State for upload loading
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null); // NEW: Ref for the hidden file input

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

  // NEW: Function to handle when a file is selected
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      // To make it appear like a message, we can set the text field
      setNewMessage(`File: ${e.target.files[0].name}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !file) || !selectedUser || !accessToken || !currentUserId) return;

    let messageContent = newMessage;

    // NEW: Upload logic
    if (file) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file); // The field name must be 'file'

      try {
        const response = await apiClient.post('/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        // The backend returns the URL of the uploaded file
        messageContent = response.data.url;
      } catch (error) {
        console.error('File upload failed:', error);
        alert('File upload failed! Make sure it is a valid type and under 5MB.');
        setIsUploading(false);
        setFile(null);
        setNewMessage('');
        return;
      } finally {
        setIsUploading(false);
        setFile(null);
      }
    }

    const socket = getSocket(accessToken);
    socket.emit('privateMessage', {
      senderId: currentUserId,
      recipientId: selectedUser._id,
      content: messageContent,
    });

    addMessage({
      _id: new Date().toISOString(),
      sender: currentUserId,
      recipient: selectedUser._id,
      content: messageContent,
      createdAt: new Date().toISOString(),
    });

    setNewMessage('');
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
                  window.open(presignedUrl, '_blank'); // Open the secure, temporary URL
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
      <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, borderTop: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>
        {/* NEW: Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".jpg, .jpeg, .png, .pdf" // Restrict file types on the client side
        />
        <IconButton onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          <AttachFileIcon />
        </IconButton>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type a message or attach a file..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={isUploading}
        />
        <Button type="submit" variant="contained" sx={{ ml: 1 }} disabled={isUploading}>
          {isUploading ? <CircularProgress size={24} /> : 'Send'}
        </Button>
      </Box>
    </Box>
  );
};

export default ChatWindow;