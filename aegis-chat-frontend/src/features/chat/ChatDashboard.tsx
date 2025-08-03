// In src/features/chat/ChatDashboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../app/store';
import { getSocket } from '../../services/socketService';
import { encryptMessage, decryptMessage } from '../../services/cryptoService';
import { decodeBase64 } from 'tweetnacl-util';
import { logoutSuccess } from '../auth/authSlice';
import { useNavigate } from 'react-router-dom'; // <-- ADD THIS IMPORT
import './ChatDashboard.css';

// ... (User interface is the same)
interface User {
    _id: string;
    username: string;
    email: string;
    publicKey: string;
    status: 'active' | 'pending' | 'deactivated';
}

// Update Message interface to better match our data
interface Message {
  _id: string; // From MongoDB
  content: string; // This will be the DECRYPTED content
  sender: string; // Sender's user ID
  recipient: string; // Recipient's user ID
  createdAt: string;
}

// Interface for messages received from the API (before decryption)
interface EncryptedMessage {
  _id: string;
  content: string; // This will be encrypted content from API
  sender: string;
  recipient: string;
  createdAt: string;
}

const ChatDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  
  const { token: authToken, user: currentUser } = useSelector((state: RootState) => state.auth);
  const keyPair = useSelector((state: RootState) => state.crypto.keyPair);
  const messageAreaRef = useRef<HTMLDivElement>(null); // To auto-scroll
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const handleLogout = () => {
    dispatch(logoutSuccess());
    navigate('/login');
  };

  // Effect for fetching users (no change)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/users', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        
        let allUsers: User[] = await response.json();
        
        // **THE FIX: Filter out the current user from the list**
        if (currentUser) {
          allUsers = allUsers.filter(user => user._id !== currentUser.id);
        }
        
        setUsers(allUsers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    if (authToken) {
      fetchUsers();
    }
  }, [authToken, currentUser]);

  // **NEW**: Effect for handling incoming messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const messageListener = (incomingMessage: { content: string, senderId: string }) => {
      if (!keyPair || !selectedUser || incomingMessage.senderId !== selectedUser._id) {
          // If we don't have keys, are not viewing a chat, or the message is not from the selected user, ignore it for now.
          // A more advanced implementation would show a notification.
          return;
      }

      // Decrypt the message
      const mySecretKey = decodeBase64(keyPair.secretKey);
      const decryptedContent = decryptMessage(incomingMessage.content, selectedUser.publicKey, mySecretKey);

      if (decryptedContent) {
        const newMessage: Message = {
            _id: new Date().toISOString(), // Use a temporary ID
            content: decryptedContent,
            sender: incomingMessage.senderId,
            recipient: currentUser!.id,
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, newMessage]);
      }
    };

    socket.on('privateMessage', messageListener);

    return () => {
      socket.off('privateMessage', messageListener);
    };
  }, [keyPair, selectedUser, currentUser]);

  // **NEW**: Effect for auto-scrolling
  useEffect(() => {
    if (messageAreaRef.current) {
        messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    }
  }, [messages]);


  const handleSelectUser = async (user: User) => {
    setSelectedUser(user);
    // Fetch conversation history from the backend
    try {
        const response = await fetch(`http://localhost:8000/api/messages/${user._id}`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });
        const history: EncryptedMessage[] = await response.json();
        
        // Decrypt historical messages
        if(keyPair) {
            const mySecretKey = decodeBase64(keyPair.secretKey);
            const decryptedHistory = history.map((msg: EncryptedMessage) => {
                const theirPublicKey = msg.sender === currentUser?.id ? selectedUser!.publicKey : user.publicKey;
                const decryptedContent = decryptMessage(msg.content, theirPublicKey, mySecretKey);
                return { ...msg, content: decryptedContent || "Failed to decrypt message" };
            });
            setMessages(decryptedHistory);
        }

    } catch (error) {
        console.error("Failed to fetch history:", error);
        setMessages([]);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser?.publicKey) {
        alert(`${selectedUser?.username} has not generated their encryption keys yet. They need to log in to the app first.`);
        return;
    }
    
    if (!message.trim() || !selectedUser || !keyPair) return;

    // 1. Encrypt the message using our crypto service
    const mySecretKey = decodeBase64(keyPair.secretKey);
    const encryptedContent = encryptMessage(message, selectedUser.publicKey, mySecretKey);

    // 2. Emit the 'privateMessage' event to the server
    const socket = getSocket();
    socket.emit('privateMessage', {
      recipientId: selectedUser._id,
      content: encryptedContent,
    });

    // 3. Add the message to our own UI immediately for a snappy feel
    const newMessage: Message = {
        _id: new Date().toISOString(),
        content: message,
        sender: currentUser!.id,
        recipient: selectedUser._id,
        createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);

    setMessage('');
  };

  return (
    // ... JSX is almost the same, with two changes:
    // 1. Add `ref={messageAreaRef}` to the `message-area` div.
    // 2. Map over the real `messages` state.
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>Aegis Chat</h3>
          <button onClick={handleLogout} style={{marginTop: '10px'}}>Logout</button>
        </div>
        <div className="user-list">
          <h4>Directory</h4>
          <ul>
            {users.map(user => (
              <li 
                key={user._id} 
                className={selectedUser?._id === user._id ? 'active' : ''}
                onClick={() => handleSelectUser(user)}
              >
                <div className="user-avatar">{user.username.charAt(0)}</div>
                <span className="user-name">{user.username}</span>
                <span className={`status-dot ${user.status}`}></span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="chat-area">
        {selectedUser ? (
          <>
            <header className="chat-header">
              <div className="user-avatar-large">{selectedUser.username.charAt(0)}</div>
              <div className="user-details">
                <span className="user-name-large">{selectedUser.username}</span>
                <span className="user-status">{selectedUser.email}</span>
              </div>
            </header>
            <div className="message-area" ref={messageAreaRef}>
              {messages.map((msg) => (
                <div key={msg._id} className={`message-bubble ${msg.sender === currentUser?.id ? 'me' : 'them'}`}>
                  <p>{msg.content}</p>
                </div>
              ))}
            </div>
            <form className="message-composer" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type an encrypted message..."
              />
              <button type="submit">Send</button>
            </form>
          </>
        ) : (
          <div className="placeholder-text">
            <h2>Welcome, {currentUser?.username}!</h2>
            <p>Select a user from the directory to begin a secure conversation.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatDashboard;