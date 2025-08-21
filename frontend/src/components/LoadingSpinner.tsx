// src/components/LoadingSpinner.tsx
import React from 'react';
import { Box, CircularProgress } from '@mui/material';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 40, 
  color = 'var(--color-tussock)',
  message = 'Loading...'
}) => {
  return (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: 4,
        minHeight: '200px'
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress 
          size={size}
          thickness={3}
          sx={{
            color: color,
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': {
                transform: 'rotate(0deg)',
              },
              '100%': {
                transform: 'rotate(360deg)',
              },
            },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '1rem',
          }}
        >
          🛡️
        </Box>
      </Box>
      
      {message && (
        <Box
          sx={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            fontWeight: 500,
            textAlign: 'center',
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': {
                opacity: 1,
              },
              '50%': {
                opacity: 0.7,
              },
            },
          }}
        >
          {message}
        </Box>
      )}
    </Box>
  );
};

export default LoadingSpinner;
