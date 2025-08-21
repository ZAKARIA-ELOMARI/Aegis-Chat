// src/types/message.ts
export interface Message {
  _id: string;
  sender: string;
  recipient: string;
  // Note: The backend stores content as a Buffer. We'll treat it as a string for now.
  // For E2EE, this would be handled as a buffer/typed array.
  content: string; 
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  readBy?: Array<{
    userId: string;
    readAt: string;
  }>;
  isBroadcast?: boolean;
}