// src/pages/DashboardPage.tsx
import React from 'react';
import { Typography, Container } from '@mui/material';

const DashboardPage: React.FC = () => {
  return (
    <Container>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to Aegis Chat
        </Typography>
        <Typography variant="body1">
          Select an employee from the list on the left to start a conversation.
        </Typography>
    </Container>
  );
};

export default DashboardPage;