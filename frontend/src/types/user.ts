// src/types/user.ts

export interface Role {
  _id: string;
  name: string;
  permissions: string[];
}

export interface User {
  _id: string;
  username: string;
  email: string;
  publicKey?: string; // Add optional publicKey
  role: Role;
  status: 'pending' | 'active' | 'deactivated';
  createdAt: string;
  updatedAt: string;
}