// src/components/ChatWindow.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Box, TextField, Button, Typography, IconButton } from '@mui/material';
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

          // 4. Mark unread messages as read
          const unreadMessages = historicalMessages.filter(msg => 
            msg.sender !== currentUserId && !msg.readAt
          );

          for (const msg of unreadMessages) {
            try {
              await apiClient.put(`/messages/${msg._id}/read`);
              
              // Also emit socket event for real-time read receipt
              if (accessToken) {
                const socket = getSocket(accessToken);
                socket.emit('messageRead', { messageId: msg._id });
              }
            } catch (error) {
              console.error('Failed to mark message as read:', error);
            }
          }

        } catch (error) {
          console.error('Failed to fetch or decrypt message history:', error);
        }
      };
      fetchHistory();
    }
  }, [selectedUser, setMessages, currentUserId, accessToken]); // Added currentUserId and accessToken to dependency array

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
    <Box className="chat-window">
      <Box className="chat-header">
        <Typography className="chat-header-title">
          <span className="chat-header-status"></span>
          Chat with {selectedUser.username}
        </Typography>
      </Box>
      
      <Box className="chat-messages">
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

          // Determine read receipt status for sent messages
          const isMyMessage = msg.sender === currentUserId;
          let readReceiptIcon = '';
          
          if (isMyMessage) {
            if (msg.readAt) {
              readReceiptIcon = '✓✓'; // Read (blue double check)
            } else if (msg.deliveredAt) {
              readReceiptIcon = '✓✓'; // Delivered (gray double check)
            } else {
              readReceiptIcon = '✓'; // Sent (single check)
            }
          }

          return (
            <Box
              key={msg._id}
              className={`message-bubble ${isMyMessage ? 'sent' : 'received'}`}
            >
              {isFileUrl ? (
                <a 
                  href={msg.content} 
                  onClick={handleFileClick} 
                  className="message-file-link"
                >
                  📎 {fileName}
                </a>
              ) : (
                <Typography className="message-content">{msg.content}</Typography>
              )}
              
              {/* Read receipt for sent messages */}
              {isMyMessage && (
                <Box className="message-status" sx={{ 
                  fontSize: '0.7rem', 
                  color: msg.readAt ? '#4fc3f7' : '#9e9e9e',
                  textAlign: 'right',
                  mt: 0.5 
                }}>
                  {readReceiptIcon}
                </Box>
              )}
              
              {/* Timestamp */}
              <Box className="message-timestamp" sx={{ 
                fontSize: '0.7rem', 
                color: 'text.secondary',
                textAlign: isMyMessage ? 'right' : 'left',
                mt: 0.5 
              }}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Box>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>

      {/* Typing indicator */}
      <Box className="typing-indicator">
        {typingUser === selectedUser?._id && (
          <span>
            {selectedUser.username} is typing
            <span className="typing-dots">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </span>
          </span>
        )}
      </Box>

      <Box component="form" onSubmit={handleSendMessage} className="chat-input-container">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".jpg, .jpeg, .png, .pdf"
        />
        <IconButton 
          onClick={() => fileInputRef.current?.click()}
          className="file-input-button"
        >
          <AttachFileIcon />
        </IconButton>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type a message or attach a file..."
          value={newMessage}
          onChange={handleInputChange}
          className="chat-text-field"
        />
        <Button 
          type="submit" 
          variant="contained" 
          className="send-button"
          disabled={!newMessage.trim()}
        >
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default ChatWindow;