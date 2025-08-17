// src/components/ChatWindow.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Box, TextField, Button, Paper, Typography, IconButton } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import useUserStore from '../store/userStore';
import useAuthStore from '../store/authStore';
import type { Message } from '../types/message';
import apiClient from '../api/apiClient';
import { getSocket } from '../api/socketClient';
import { getKeys, encryptMessage, decryptMessage } from '../utils/crypto';

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
          const response = await apiClient.get<Message[]>(`/messages/${selectedUser._id}`);
          const historicalMessages = response.data;

          // --- START E2EE DECRYPTION FOR HISTORY ---

          // 1. Get our keys and the public key of the person we are chatting with.
          const myKeys = getKeys();
          const theirPublicKey = selectedUser.publicKey;

          if (!myKeys || !myKeys.secretKey || !theirPublicKey) {
            console.error("Cannot decrypt history, keys are missing.");
            // Display encrypted messages as is, or show an error state
            setMessages(historicalMessages); 
            return;
          }

          // 2. Map over each historical message and decrypt its content.
          const decryptedMessages = historicalMessages.map(msg => {
            // We need to know who the sender was to use the correct public key.
            const isMyMessage = msg.sender === currentUserId;
            
            const decryptedContent = decryptMessage(
              msg.content,
              isMyMessage ? selectedUser.publicKey! : theirPublicKey, // Use recipient's key if I sent it
              myKeys.secretKey
            );

            // Return a new message object with the decrypted content.
            return {
              ...msg,
              content: decryptedContent || "[Decryption Failed]",
            };
          });

          // --- END E2EE DECRYPTION FOR HISTORY ---

          // 3. Set the component's state with the fully decrypted messages.
          setMessages(decryptedMessages);

        } catch (error) {
          console.error('Failed to fetch or decrypt message history:', error);
        }
      };
      fetchHistory();
    }
  }, [selectedUser, setMessages, currentUserId]); // Added currentUserId to dependency array

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

  // File: frontend/src/components/ChatWindow.tsx

const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation to ensure we have everything we need
    if (!newMessage.trim() || !selectedUser || !accessToken || !currentUserId) {
        return;
    }

    // --- START E2EE LOGIC ---

    // 1. Get the current user's secret key from local storage.
    const myKeys = getKeys();
    // 2. Get the recipient's public key from the user object in our state.
    const recipientPublicKey = selectedUser.publicKey;

    // 3. CRITICAL CHECK: Ensure both keys are available before proceeding.
    if (!myKeys || !myKeys.secretKey || !recipientPublicKey) {
        alert('Cannot send message. Cryptographic keys are missing for you or the recipient.');
        console.error("Encryption keys are missing.", { myKeys, recipientPublicKey });
        return;
    }

    try {
        // 4. Encrypt the plaintext message using our utility function.
        const encryptedContent = encryptMessage(
            newMessage,
            recipientPublicKey,
            myKeys.secretKey
        );
        
        // --- END E2EE LOGIC ---

        const socket = getSocket(accessToken);
        const messageData = {
            senderId: currentUserId,
            recipientId: selectedUser._id,
            content: encryptedContent, // 5. Send the encrypted payload string.
        };

        socket.emit('privateMessage', messageData);

        // 6. Optimistically add the PLAINTEXT message to our own UI immediately.
        //    This makes the app feel responsive. We don't need to decrypt our own message.
        addMessage({
            _id: new Date().toISOString(), // Temporary ID for rendering
            sender: currentUserId,
            recipient: selectedUser._id,
            content: newMessage, // Use original plaintext for our own view
            createdAt: new Date().toISOString(),
        });

        setNewMessage('');
    } catch (error) {
        console.error('Failed to encrypt or send message:', error);
        alert('A cryptographic error occurred. Could not send message.');
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