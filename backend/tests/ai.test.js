const request = require('supertest');
const express = require('express');
const aiRoutes = require('../routes/ai.routes');
const jwt = require('jsonwebtoken');

// --- Mocking the OpenAI Client ---
// We mock the entire 'openai' library.
jest.mock('openai', () => {
  // We need to mock the nested structure OpenAI uses
  const mockChatCompletions = {
    create: jest.fn(),
  };
  const mockOpenAI = {
    chat: {
      completions: mockChatCompletions,
    },
  };
  // The library's default export is a class, so we return a constructor function
  return jest.fn().mockImplementation(() => mockOpenAI);
});

// We also need to get a reference to the mock function after it has been defined
const OpenAI = require('openai');
const mockCreate = new OpenAI().chat.completions.create;


// --- Test Setup ---
process.env.JWT_SECRET = 'your-super-secret-test-key';

const app = express();
app.use(express.json());

// Apply the real router
app.use('/api/ai', aiRoutes);

// --- Test Suite ---
describe('AI Chatbot API', () => {
    let authToken;

    beforeEach(() => {
        // Clear mocks before each test
        jest.clearAllMocks();
        // Generate a fresh token for each test to represent a logged-in user
        authToken = jwt.sign({ user: { id: 'ai-user-id', role: 'employee' } }, process.env.JWT_SECRET);
    });

    describe('POST /api/ai/chat', () => {
        it('should return a successful response from the mocked AI', async () => {
            // Arrange: Configure the mock to return a specific response
            const aiResponseText = 'This is a helpful response about cybersecurity.';
            mockCreate.mockResolvedValue({
                choices: [{ message: { content: aiResponseText } }],
            });

            // Act
            const res = await request(app)
                .post('/api/ai/chat')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ prompt: 'What is phishing?' });

            // Assert
            expect(res.statusCode).toBe(200);
            expect(res.body.response).toBe(aiResponseText);

            // Assert that the OpenAI client was called correctly
            expect(mockCreate).toHaveBeenCalledWith({
                model: "gpt-3.5-turbo",
                messages: expect.arrayContaining([
                    expect.objectContaining({ role: "system" }),
                    expect.objectContaining({ role: "user", content: "What is phishing?" })
                ])
            });
        });

        it('should return 400 Bad Request if the prompt is missing', async () => {
            const res = await request(app)
                .post('/api/ai/chat')
                .set('Authorization', `Bearer ${authToken}`)
                .send({}); // <-- Sending an empty body

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('A prompt is required.');
            // Ensure the AI was not called if validation fails
            expect(mockCreate).not.toHaveBeenCalled();
        });

        it('should handle errors from the OpenAI API gracefully', async () => {
            // Arrange: Mock the create function to throw an error
            const errorMessage = 'OpenAI API is down';
            mockCreate.mockRejectedValue(new Error(errorMessage));

            // Act
            const res = await request(app)
                .post('/api/ai/chat')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ prompt: 'Tell me something' });

            // Assert
            expect(res.statusCode).toBe(500);
            expect(res.body.message).toBe('Failed to get a response from the AI assistant.');
        });
    });
});