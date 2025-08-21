// src/store/broadcastStore.ts
import { create } from 'zustand';
import type { Message } from '../types/message';

interface BroadcastState {
  messages: Message[];
  isPanelOpen: boolean;
  unreadCount: number;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  togglePanel: () => void;
  markAllAsRead: () => void;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
}

const useBroadcastStore = create<BroadcastState>((set) => ({
  messages: [],
  isPanelOpen: false,
  unreadCount: 0,
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => {
    set((state) => ({ 
      messages: [message, ...state.messages],
      unreadCount: state.unreadCount + 1
    }));
  },
  togglePanel: () => {
    set((state) => ({ 
      isPanelOpen: !state.isPanelOpen,
      // Mark as read when panel is opened
      unreadCount: state.isPanelOpen ? state.unreadCount : 0
    }));
  },
  markAllAsRead: () => set({ unreadCount: 0 }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
}));

export default useBroadcastStore;