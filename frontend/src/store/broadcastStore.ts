// src/store/broadcastStore.ts
import { create } from 'zustand';
import type { Message } from '../types/message';

interface BroadcastState {
  messages: Message[];
  isPanelOpen: boolean;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  togglePanel: () => void;
}

const useBroadcastStore = create<BroadcastState>((set) => ({
  messages: [],
  isPanelOpen: false,
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [message, ...state.messages] })),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
}));

export default useBroadcastStore;