// src/store/userStore.ts
import { create } from 'zustand';
import type { User } from '../types/user';
import type { Message } from '../types/message'; // Import Message type

interface UserState {
  users: User[];
  selectedUser: User | null;
  messages: Message[]; // Add messages array
  onlineUsers: string[]; // NEW: Array of online user IDs
  typingUser: string | null; // NEW: ID of the user who is currently typing
  unreadCounts: Record<string, number>; // Track unread count per user ID
  setUsers: (users: User[]) => void;
  setSelectedUser: (user: User | null) => void;
  setMessages: (messages: Message[]) => void; // Add setter for messages
  addMessage: (message: Message) => void; // Add function to append a new message
  setOnlineUsers: (userIds: string[]) => void; // NEW
  setTypingUser: (userId: string | null) => void; // NEW
  incrementUnreadCount: (userId: string) => void;
  clearUnreadCount: (userId: string) => void;
  setUnreadCount: (userId: string, count: number) => void;
}

const useUserStore = create<UserState>((set) => ({
  users: [],
  selectedUser: null,
  messages: [], // Initialize messages
  onlineUsers: [], // NEW
  typingUser: null, // NEW
  unreadCounts: {}, // Initialize unread counts
  setUsers: (users) => set({ users }),
  setSelectedUser: (user) => {
    // When a user is selected, clear previous messages and mark as read
    set((state) => ({ 
      selectedUser: user, 
      messages: [],
      unreadCounts: user ? { 
        ...state.unreadCounts, 
        [user._id]: 0 
      } : state.unreadCounts
    }));
  },
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }), // NEW
  setTypingUser: (userId) => set({ typingUser: userId }), // NEW
  incrementUnreadCount: (userId) => set((state) => ({
    unreadCounts: {
      ...state.unreadCounts,
      [userId]: (state.unreadCounts[userId] || 0) + 1
    }
  })),
  clearUnreadCount: (userId) => set((state) => ({
    unreadCounts: {
      ...state.unreadCounts,
      [userId]: 0
    }
  })),
  setUnreadCount: (userId, count) => set((state) => ({
    unreadCounts: {
      ...state.unreadCounts,
      [userId]: count
    }
  })),
}));

export default useUserStore;