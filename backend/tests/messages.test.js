const request = require('supertest');
const express = require('express');
const messageRoutes = require('../routes/message.routes');
const User = require('../models/user.model');
const Message = require('../models/message.model');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// --- Test Setup ---
process.env.JWT_SECRET = 'your-super-secret-test-key';

const app = express();
app.use(express.json());

// Apply the real router
app.use('/api/messages', messageRoutes);


// --- Test Suite ---
describe('Message API', () => {
    let userOne, userTwo, userOneToken;

    beforeAll(async () => {
        // Clean the collections to ensure a clean state
        await User.deleteMany({});
        await Message.deleteMany({});

        // Create two users for the conversation
        userOne = await User.create({ username: 'userOne', passwordHash: 'hash', status: 'active' });
        userTwo = await User.create({ username: 'userTwo', passwordHash: 'hash', status: 'active' });

        // Create a token for userOne, who will be making the request
        userOneToken = jwt.sign({ user: { id: userOne.id } }, process.env.JWT_SECRET);

        // Create a conversationId
        const conversationId = [userOne.id, userTwo.id].sort().join('_');

        // Pre-populate the database with some messages for the conversation
        await Message.create([
            { sender: userOne.id, recipient: userTwo.id, content: 'Hello from user one!', conversationId },
            { sender: userTwo.id, recipient: userOne.id, content: 'Hi back from user two!', conversationId },
            { sender: userOne.id, recipient: userTwo.id, content: 'How are you?', conversationId },
        ]);

        // Create a message for a different conversation to ensure it's not included
        const userThree = await User.create({ username: 'userThree', passwordHash: 'hash', status: 'active' });
        const otherConversationId = [userOne.id, userThree.id].sort().join('_');
        await Message.create({ sender: userOne.id, recipient: userThree.id, content: 'This is another chat.', conversationId: otherConversationId });
    });


    describe('GET /api/messages/:otherUserId', () => {
        it("should return the conversation history between the logged-in user and another user", async () => {
            const res = await request(app)
                .get(`/api/messages/${userTwo.id}`)
                .set('Authorization', `Bearer ${userOneToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            
            // Should only get the 3 messages from the specific conversation
            expect(res.body.length).toBe(3); 
            
            // Check the content of the messages
            expect(res.body[0].content).toBe('Hello from user one!');
            expect(res.body[1].content).toBe('Hi back from user two!');
            expect(res.body[2].content).toBe('How are you?');
        });

        it('should return an empty array if there is no history', async () => {
            const userWithNoHistory = await User.create({ username: 'lonelyUser', passwordHash: 'hash', status: 'active' });
            
            const res = await request(app)
                .get(`/api/messages/${userWithNoHistory.id}`)
                .set('Authorization', `Bearer ${userOneToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const res = await request(app)
                .get(`/api/messages/${userTwo.id}`);

            expect(res.statusCode).toBe(401);
        });

        it('should return 400 if the otherUserId is not a valid ObjectId', async () => {
            const res = await request(app)
                .get('/api/messages/invalid-user-id')
                .set('Authorization', `Bearer ${userOneToken}`);

            // Check for the new validation we added
            expect(res.statusCode).toBe(400); // <-- Change to 400
            expect(res.body.message).toBe('Invalid user ID format.'); // <-- Add this check
        });
    });
});