// src/pages/DashboardPage.tsx
import React from 'react';
import { Typography, Box, Card, CardContent, Button, Avatar } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SecurityIcon from '@mui/icons-material/Security';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuthStore();

  const features = [
    {
      icon: <ChatIcon />,
      title: 'Secure Messaging',
      description: 'Connect with your team using military-grade end-to-end encryption for complete privacy.',
      action: 'Start Chatting',
      path: '/chat',
      gradient: 'linear-gradient(135deg, #8e5239 0%, #c68954 100%)'
    },
    {
      icon: <SecurityIcon />,
      title: 'Account Security',
      description: 'Advanced security controls including 2FA, session management, and audit logs.',
      action: 'Security Center',
      path: '/security',
      gradient: 'linear-gradient(135deg, #42332b 0%, #8e5239 100%)'
    },
    {
      icon: <PsychologyIcon />,
      title: 'AI Assistant',
      description: 'Intelligent AI-powered assistance for productivity and smart automation.',
      action: 'Launch AI',
      path: '/assistant',
      gradient: 'linear-gradient(135deg, #c68954 0%, #d49968 100%)'
    }
  ];

  return (
    <Box className="dashboard-page">
      <Box className="dashboard-header">
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 2,
          mb: 2
        }}>
          <TrendingUpIcon sx={{ 
            fontSize: '2.5rem', 
            color: 'var(--color-tussock)',
            animation: 'float 6s ease-in-out infinite'
          }} />
          <Typography className="dashboard-title">
            Welcome to Aegis
          </Typography>
        </Box>
        <Typography className="dashboard-subtitle">
          Your secure, intelligent communication platform
        </Typography>
      </Box>

      <Box className="dashboard-content">
        {features.map((feature, index) => (
          <Card 
            key={index} 
            className="dashboard-card hover-lift"
            sx={{
              background: 'rgba(255, 255, 255, 0.95) !important',
              backdropFilter: 'blur(20px) saturate(180%) !important'
            }}
          >
            <CardContent>
              <Avatar 
                className="dashboard-card-icon"
                sx={{
                  background: feature.gradient
                }}
              >
                {feature.icon}
              </Avatar>
              
              <Typography className="dashboard-card-title">
                {feature.title}
              </Typography>
              
              <Typography className="dashboard-card-description">
                {feature.description}
              </Typography>
              
              <Button
                className="dashboard-card-action"
                onClick={() => navigate(feature.path)}
                fullWidth
                sx={{
                  background: feature.gradient + ' !important',
                  boxShadow: 'var(--shadow-md) !important',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 'var(--shadow-lg) !important'
                  }
                }}
              >
                {feature.action}
              </Button>
            </CardContent>
          </Card>
        ))}

        {role === 'Super Admin' && (
          <Card 
            className="dashboard-card hover-lift"
            sx={{
              background: 'rgba(255, 255, 255, 0.95) !important',
              backdropFilter: 'blur(20px) saturate(180%) !important'
            }}
          >
            <CardContent>
              <Avatar 
                className="dashboard-card-icon"
                sx={{
                  background: 'linear-gradient(135deg, #42332b 0%, #8e5239 100%)',
                  fontSize: '1.5rem'
                }}
              >
                👑
              </Avatar>
              
              <Typography className="dashboard-card-title">
                Admin Panel
              </Typography>
              
              <Typography className="dashboard-card-description">
                Complete administrative control with user management, system monitoring, and security oversight.
              </Typography>
              
              <Button
                className="dashboard-card-action"
                onClick={() => navigate('/admin/users')}
                fullWidth
                sx={{
                  background: 'linear-gradient(135deg, #42332b 0%, #8e5239 100%) !important',
                  boxShadow: 'var(--shadow-md) !important',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 'var(--shadow-lg) !important'
                  }
                }}
              >
                Access Admin Panel
              </Button>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default DashboardPage;