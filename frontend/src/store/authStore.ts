// src/store/authStore.ts
import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  userId: string | null; // Add this line
  isTwoFactorEnabled: boolean | null; // ADD THIS
  role: string | null; // Add this
  csrfToken: string | null; // Add CSRF token
  isAuthenticated: boolean;
  login: (token: string, userId: string, isTwoFactorEnabled: boolean, role: string) => void; // UPDATE THIS
  logout: () => void;
  setCsrfToken: (token: string) => void; // Add CSRF token setter
}

const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  userId: null, // Add this line
  isTwoFactorEnabled: null, // ADD THIS
  role: null, // Add this
  csrfToken: null, // Add CSRF token
  isAuthenticated: false,
  login: (token, userId, isTwoFactorEnabled, role) => // UPDATE THIS
    set({ accessToken: token, userId, isTwoFactorEnabled, role, isAuthenticated: true }),
  logout: () => set({ accessToken: null, userId: null, isTwoFactorEnabled: null, role: null, csrfToken: null, isAuthenticated: false }), // UPDATE THIS
  setCsrfToken: (token) => set({ csrfToken: token }), // Add CSRF token setter
}));

export default useAuthStore;