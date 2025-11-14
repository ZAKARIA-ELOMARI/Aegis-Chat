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
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // <-- AJOUTEZ CETTE LIGNE
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

            // <-- CHANGEMENT : DÉCHIFFRER AUSSI L'URL DU FICHIER -->
            const decryptedFileUrl = msg.fileUrl ? decryptMessage(
              msg.fileUrl, // C'est l'URL cryptée
              isMyMessage ? selectedUser.publicKey! : theirPublicKey,
              myKeys.secretKey
            ) : null;

            // Return a new message object with the decrypted content.
            return {
              ...msg,
              content: decryptedContent || "[Decryption Failed]",
              fileUrl: decryptedFileUrl || null,
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
      const file = e.target.files[0];
      setSelectedFile(file); // <-- CHANGEMENT : Stocker le fichier réel
      setNewMessage(file.name); // <-- CHANGEMENT : Afficher juste le nom
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
    
    // Validation mise à jour
    if ((!newMessage.trim() && !selectedFile) || !selectedUser || !accessToken || !currentUserId) {
        return;
    }

    const myKeys = getKeys();
    const recipientPublicKey = selectedUser.publicKey;

    if (!myKeys || !myKeys.secretKey || !recipientPublicKey) {
        alert('Cannot send message. Cryptographic keys are missing for you or the recipient.');
        console.error("Encryption keys are missing.", { myKeys, recipientPublicKey });
        return;
    }

    // --- NOUVELLE LOGIQUE DE GESTION DE FICHIER ---
    if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            // 1. Uploader le fichier SÉPARÉMENT pour obtenir l'URL
            console.log("Uploading file...");
            // PAS D'EN-TÊTE 'Content-Type' ! axios le fait pour vous.
            const uploadResponse = await apiClient.post('/files/upload', formData);
            
            const fileUrl = uploadResponse.data.url; // L'URL de MinIO
            console.log("File uploaded, URL:", fileUrl);
            
            // 2. Maintenant, envoyer les infos du message via socket
            const socket = getSocket(accessToken);
            const messageData = {
                senderId: currentUserId,
                recipientId: selectedUser._id,
                content: encryptMessage(newMessage, recipientPublicKey, myKeys.secretKey), // Le nom du fichier crypté
                fileUrl: encryptMessage(fileUrl, recipientPublicKey, myKeys.secretKey) // L'URL MinIO cryptée
            };
            socket.emit('privateMessage', messageData);

            // 3. Ajouter à l'UI locale
            addMessage({
                _id: new Date().toISOString(),
                sender: currentUserId,
                recipient: selectedUser._id,
                content: newMessage, // Le nom du fichier en clair
                fileUrl: fileUrl, // L'URL MinIO en clair
                createdAt: new Date().toISOString(),
            });

            // 4. Réinitialiser
            setNewMessage('');
            setSelectedFile(null); // <-- TRÈS IMPORTANT
            if (fileInputRef.current) fileInputRef.current.value = ''; // Réinitialiser le champ de fichier

        } catch (error) {
            console.error('File upload failed:', error);
            alert('File upload failed. It may be unsafe or too large.');
        }
    
    // --- LOGIQUE D'ENVOI DE TEXTE (votre code existant) ---
    } else if (newMessage.trim()) { 
        try {
            const encryptedContent = encryptMessage(
                newMessage,
                recipientPublicKey,
                myKeys.secretKey
            );
            
            const socket = getSocket(accessToken);
            const messageData = {
                senderId: currentUserId,
                recipientId: selectedUser._id,
                content: encryptedContent,
                fileUrl: null // Pas de fichier
            };
    
            socket.emit('privateMessage', messageData);
    
            addMessage({
                _id: new Date().toISOString(),
                sender: currentUserId,
                recipient: selectedUser._id,
                content: newMessage,
                fileUrl: null, // Pas de fichier
                createdAt: new Date().toISOString(),
            });
    
            setNewMessage('');
        } catch (error) {
            console.error('Failed to encrypt or send message:', error);
            alert('A cryptographic error occurred. Could not send message.');
        }
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
        // Remplacez cette section dans ChatWindow.tsx (lignes 246-304)
{messages.map((msg) => {
  // Déterminer si c'est un message avec fichier
  const isFileMessage = !!msg.fileUrl;
  const messageText = msg.content; // Nom du fichier ou texte normal

  const handleFileClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!msg.fileUrl) return;

    // Extraire la clé du fichier depuis l'URL MinIO
    const fileKey = msg.fileUrl.split('/').pop();
    if (!fileKey) {
      console.error("Could not parse file key from URL:", msg.fileUrl);
      alert("Error: Invalid file URL.");
      return;
    }

    try {
      console.log("Requesting access for file key:", fileKey);
      const response = await apiClient.get(`/files/access/${fileKey}`);
      const presignedUrl = response.data.url;
      window.open(presignedUrl, '_blank');
    } catch (error) {
      console.error("Could not get secure link for file", error);
      alert("Error: Could not access file.");
    }
  };

  // Déterminer le statut de lecture pour les messages envoyés
  const isMyMessage = msg.sender === currentUserId;
  let readReceiptIcon = '';
  
  if (isMyMessage) {
    if (msg.readAt) {
      readReceiptIcon = '✓✓'; // Lu (double coche bleue)
    } else if (msg.deliveredAt) {
      readReceiptIcon = '✓✓'; // Délivré (double coche grise)
    } else {
      readReceiptIcon = '✓'; // Envoyé (simple coche)
    }
  }

  return (
    <Box
      key={msg._id}
      className={`message-bubble ${isMyMessage ? 'sent' : 'received'}`}
    >
      {isFileMessage ? (
        <a 
          href="#" 
          onClick={handleFileClick} 
          className="message-file-link"
        >
          📎 {messageText}
        </a>
      ) : (
        <Typography className="message-content">{messageText}</Typography>
      )}
      
      {/* Read receipt pour les messages envoyés */}
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