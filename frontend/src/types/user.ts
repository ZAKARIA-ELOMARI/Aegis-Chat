// src/types/user.ts
export interface User {
  _id: string;
  username: string;
  email: string;
  status: 'pending' | 'active' | 'deactivated';
  createdAt: string;
  updatedAt: string;
}