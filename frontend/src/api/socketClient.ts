// src/api/socketClient.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export const getSocket = (token: string): Socket => {
  if (!socket) {
    socket = io('http://localhost:8000', {
      auth: {
        token: token,
      },
    });
  }
  return socket;
};