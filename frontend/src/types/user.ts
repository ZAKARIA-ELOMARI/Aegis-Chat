// src/types/user.ts
export interface User {
  _id: string;
  username: string;
  email: string;
  publicKey?: string; // Add optional publicKey
  status: 'pending' | 'active' | 'deactivated';
  createdAt: string;
  updatedAt: string;
}