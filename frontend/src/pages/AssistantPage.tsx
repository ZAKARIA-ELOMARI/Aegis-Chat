// src/pages/AssistantPage.tsx
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Container,
  CircularProgress,
} from '@mui/material';
import apiClient from '../api/apiClient';

// Type for a single message in the AI chat
interface AiMessage {
  sender: 'user' | 'ai';
  text: string;
}

const AssistantPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const newMessages: AiMessage[] = [...messages, { sender: 'user', text: prompt }];
    setMessages(newMessages);
    setIsLoading(true);
    setPrompt('');

    try {
      const response = await apiClient.post('/ai/chat', { prompt });
      const aiResponse = response.data.response;
      setMessages([...newMessages, { sender: 'ai', text: aiResponse }]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      setMessages([
        ...newMessages,
        { sender: 'ai', text: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 2, mt: 2, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
        <Typography variant="h5" gutterBottom>
          Aegis AI Assistant
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ask me anything about cybersecurity best practices.
        </Typography>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
          {messages.map((msg, index) => (
            <Box key={index} sx={{ mb: 2, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  display: 'inline-block',
                  bgcolor: msg.sender === 'user' ? 'primary.light' : 'background.paper',
                }}
              >
                <Typography variant="body1">{msg.text}</Typography>
              </Paper>
            </Box>
          ))}
        </Box>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Ask a question..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" variant="contained" sx={{ ml: 1 }} disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : 'Send'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AssistantPage;