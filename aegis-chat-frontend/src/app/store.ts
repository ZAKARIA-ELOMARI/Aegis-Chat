// In src/app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import cryptoReducer from '../features/crypto/cryptoSlice'; // Import the new reducer

export const store = configureStore({
  reducer: {
    auth: authReducer,
    crypto: cryptoReducer, // Add the crypto reducer
  },
  // This middleware is needed to allow storing non-serializable data like Uint8Array
  // but we will avoid that by converting keys to base64 in the slice.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;