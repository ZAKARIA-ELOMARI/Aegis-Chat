// In src/App.tsx
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from './app/store';
import LoginPage from './features/auth/LoginPage';
import { useEffect } from 'react';
import { authCheckCompleted } from './features/auth/authSlice';
import { initiateSocketConnection, disconnectSocket } from './services/socketService';

import ChatDashboard from './features/chat/ChatDashboard'; // Update the import

// We will create these pages next
// import SetInitialPasswordPage from './features/auth/SetInitialPasswordPage';
// import ChatDashboard from './features/chat/ChatDashboard';

// Dummy component for now
const SetInitialPasswordPage = () => <h1>Set Your New Password</h1>;


// This is our Protected Route component. It checks for authentication
// before rendering its children.
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};


function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);

  // This effect runs once on app startup
  useEffect(() => {
    // In a real app, you might check for a token in secure storage here.
    // For now, we simply tell Redux the initial check is done.
    dispatch(authCheckCompleted());
  }, [dispatch]);

  // **NEW**: This effect manages the socket connection
  useEffect(() => {
    if (isAuthenticated && token) {
      initiateSocketConnection(token);
    }

    // Cleanup function to disconnect socket when the component unmounts
    // or when the user is no longer authenticated.
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, token]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-initial-password" element={<SetInitialPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<ChatDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;