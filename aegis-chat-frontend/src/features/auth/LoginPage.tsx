// In src/features/auth/LoginPage.tsx
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from './authSlice';
import { loginApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { initializeKeys } from '../crypto/cryptoSlice';
import type { AppDispatch } from '../../app/store'; // Import AppDispatch type
 // Import AppDispatch type
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch<AppDispatch>(); // Use the typed dispatch
  const navigate = useNavigate();

  // Disable body scrolling when component mounts
  React.useEffect(() => {
    // Store original styles
    const originalStyle = {
      overflow: document.body.style.overflow,
      height: document.body.style.height,
      margin: document.body.style.margin,
      padding: document.body.style.padding,
    };

    // Apply full-screen styles
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100vh';

    // Cleanup function to restore original styles
    return () => {
      document.body.style.overflow = originalStyle.overflow;
      document.body.style.height = originalStyle.height;
      document.body.style.margin = originalStyle.margin;
      document.body.style.padding = originalStyle.padding;
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const data = await loginApi(email, password);

      // Handle the different login scenarios from the backend
      if (data.initialPasswordSetupRequired) {
        // Redirect to a new page to set the password
        navigate('/set-initial-password', { state: { tempToken: data.tempToken } });
      } else if (data.twoFactorRequired) {
        // We will handle this in a later step
        navigate('/2fa-verify', { state: { tempToken: data.tempToken } });
      } else if (data.accessToken) {
        // This part is now fixed and sequential
        
        // FIRST, dispatch loginSuccess. The UI will react, but we don't need to wait for it.
        dispatch(loginSuccess({ token: data.accessToken }));

        // SECOND, dispatch initializeKeys and pass the token directly to it.
        // We `await` this step to ensure keys are generated before we navigate.
        await dispatch(initializeKeys(data.accessToken));

        // FINALLY, navigate to the dashboard.
        navigate('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to your Aegis Chat account</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>
          
          <button 
            className="login-button" 
            type="submit" 
            disabled={isLoading || !email || !password}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </form>
        
        <div className="forgot-password">
          <a href="#" className="forgot-password-link">
            Forgot your password?
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;