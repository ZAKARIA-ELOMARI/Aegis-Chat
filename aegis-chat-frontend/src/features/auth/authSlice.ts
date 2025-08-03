// In src/features/auth/authSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode'; // <-- IMPORT THE DECODER

// Define a type for the decoded JWT payload
interface JwtPayload {
  sub: string;
  username: string;
}

// Define the shape of our authentication state
interface AuthState {
  user: { id: string; username: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // MODIFIED: This action now only needs the token
    loginSuccess(state, action: PayloadAction<{ token: string }>) {
      const { token } = action.payload;
      const decoded: JwtPayload = jwtDecode(token); // Decode the token

      state.isAuthenticated = true;
      state.isLoading = false;
      state.token = token;
      // Populate user state from the decoded token payload
      state.user = { id: decoded.sub, username: decoded.username };
    },
    logoutSuccess(state) {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.user = null;
      state.token = null;
      // Also clear keys from secure storage on logout
      window.electronAPI.setStoreValue('userKeyPair', null);
    },
    authCheckCompleted(state) {
      state.isLoading = false;
    }
  },
});

export const { loginSuccess, logoutSuccess, authCheckCompleted } = authSlice.actions;
export default authSlice.reducer;