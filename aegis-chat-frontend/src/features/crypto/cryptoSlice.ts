// In src/features/crypto/cryptoSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { encodeBase64 } from 'tweetnacl-util';
import { generateKeyPair } from '../../services/cryptoService';
import { logoutSuccess } from '../auth/authSlice';

// Define the shape of our key pair for TypeScript
export interface SerializableKeyPair {
  publicKey: string;
  secretKey: string;
}

// Define the shape of the slice's state
interface CryptoState {
  keyPair: SerializableKeyPair | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed'; // For tracking async status
}

const initialState: CryptoState = {
  keyPair: null,
  status: 'idle',
};

// The Async Thunk for handling all key initialization logic
export const initializeKeys = createAsyncThunk(
  'crypto/initializeKeys',
  async (token: string, { rejectWithValue }) => {
    if (!token) return rejectWithValue('No token provided');

    try {
      // 1. Check secure storage for existing keys
      let storedKeys = await window.electronAPI.getStoreValue('userKeyPair') as SerializableKeyPair | null;

      // 2. If no keys are found, generate them
      if (!storedKeys) {
        console.log('No keys found in local storage, generating new key pair...');
        const newKeys = generateKeyPair();
        storedKeys = {
          publicKey: encodeBase64(newKeys.publicKey),
          secretKey: encodeBase64(newKeys.secretKey),
        };

        // 3. Save the new keys to secure storage
        await window.electronAPI.setStoreValue('userKeyPair', storedKeys);

        // 4. Publish the new PUBLIC key to the backend
        const response = await fetch('http://localhost:8000/api/users/key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ publicKey: storedKeys.publicKey }),
        });

        if (!response.ok) {
            throw new Error('Failed to publish public key to server.');
        }
        console.log('New public key published successfully.');
      } else {
        console.log('Found existing keys in local storage.');
      }
      
      // 5. Return the keys to be stored in the Redux state
      return storedKeys;

    } catch (error: unknown) {
      console.error("Key initialization failed:", error);
      return rejectWithValue(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  }
);

// The main slice definition
const cryptoSlice = createSlice({
  name: 'crypto',
  initialState,
  reducers: {}, // We don't need manual reducers like setKeyPair anymore
  extraReducers: (builder) => {
    builder
      // Handle the key initialization thunk lifecycle
      .addCase(initializeKeys.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(initializeKeys.fulfilled, (state, action: PayloadAction<SerializableKeyPair>) => {
        state.status = 'succeeded';
        state.keyPair = action.payload; // Set the keypair from the thunk's return value
      })
      .addCase(initializeKeys.rejected, (state) => {
        state.status = 'failed';
        state.keyPair = null;
      })
      // Handle logout: This ensures state is wiped for the next user
      .addCase(logoutSuccess, (state) => {
        state.keyPair = null;
        state.status = 'idle';
      });
  },
});

export default cryptoSlice.reducer;