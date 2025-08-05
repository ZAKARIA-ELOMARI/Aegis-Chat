// src/store/authStore.ts
import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  userId: string | null; // Add this line
  isTwoFactorEnabled: boolean | null; // ADD THIS
  role: string | null; // Add this
  isAuthenticated: boolean;
  login: (token: string, userId: string, isTwoFactorEnabled: boolean, role: string) => void; // UPDATE THIS
  logout: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  userId: null, // Add this line
  isTwoFactorEnabled: null, // ADD THIS
  role: null, // Add this
  isAuthenticated: false,
  login: (token, userId, isTwoFactorEnabled, role) => // UPDATE THIS
    set({ accessToken: token, userId, isTwoFactorEnabled, role, isAuthenticated: true }),
  logout: () => set({ accessToken: null, userId: null, isTwoFactorEnabled: null, role: null, isAuthenticated: false }), // UPDATE THIS
}));

export default useAuthStore;