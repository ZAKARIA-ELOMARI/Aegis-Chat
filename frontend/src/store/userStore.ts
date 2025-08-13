// src/store/userStore.ts
import { create } from 'zustand';
import type { User } from '../types/user';
import type { Message } from '../types/message'; // Import Message type
 // Import Message type

interface UserState {
  users: User[];
  selectedUser: User | null;
  messages: Message[]; // Add messages array
  onlineUsers: string[]; // NEW: Array of online user IDs
  typingUser: string | null; // NEW: ID of the user who is currently typing
  setUsers: (users: User[]) => void;
  setSelectedUser: (user: User | null) => void;
  setMessages: (messages: Message[]) => void; // Add setter for messages
  addMessage: (message: Message) => void; // Add function to append a new message
  setOnlineUsers: (userIds: string[]) => void; // NEW
  setTypingUser: (userId: string | null) => void; // NEW
}

const useUserStore = create<UserState>((set) => ({
  users: [],
  selectedUser: null,
  messages: [], // Initialize messages
  onlineUsers: [], // NEW
  typingUser: null, // NEW
  setUsers: (users) => set({ users }),
  setSelectedUser: (user) => {
    // When a user is selected, clear previous messages
    set({ selectedUser: user, messages: [] });
  },
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }), // NEW
  setTypingUser: (userId) => set({ typingUser: userId }), // NEW
}));

export default useUserStore;