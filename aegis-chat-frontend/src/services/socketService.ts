// In src/services/socketService.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export const initiateSocketConnection = (token: string) => {
  console.log('Attempting to connect to Socket.IO...');
  // Pass the JWT token for authentication
  socket = io('http://localhost:8000', {
    auth: {
      token,
    },
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket) socket.disconnect();
};

// This function allows other parts of our app to get the socket instance
export const getSocket = () => {
  return socket;
};