const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Message = require('../models/message.model');

// Mock the logger to prevent console noise
jest.mock('../config/logger');

// Set the secret for this test environment
process.env.JWT_SECRET = 'your-super-secret-test-key';


describe('Socket.IO Chat Server', () => {
    let io, clientSocketOne, clientSocketTwo, httpServer;
    let userOne, userTwo, userOneToken, userTwoToken;

    // Use async/await for setup
    beforeAll(async () => {
        // --- Database & User Setup ---
        await User.deleteMany({});
        await Message.deleteMany({});
        userOne = await User.create({ username: 'socketUser1', passwordHash: 'hash', status: 'active' });
        userTwo = await User.create({ username: 'socketUser2', passwordHash: 'hash', status: 'active' });
        userOneToken = jwt.sign({ user: { id: userOne.id } }, process.env.JWT_SECRET);
        userTwoToken = jwt.sign({ user: { id: userTwo.id } }, process.env.JWT_SECRET);

        // --- Server Setup ---
        // Promisify the server startup
        await new Promise((resolve) => {
            httpServer = createServer();
            io = new Server(httpServer);

            // Apply server logic
            io.use((socket, next) => {
                const token = socket.handshake.auth.token;
                if (!token) return next(new Error('No token'));
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    socket.user = decoded.user;
                    next();
                } catch (err) {
                    next(new Error('Invalid token'));
                }
            });

            io.on('connection', (socket) => {
                socket.join(socket.user.id);
                socket.on('privateMessage', async ({ recipientId, content }) => {
                    const conversationId = [socket.user.id, recipientId].sort().join('_');
                    await Message.create({
                        sender: socket.user.id, recipient: recipientId, content, conversationId
                    });
                    io.to(recipientId).emit('privateMessage', { content, senderId: socket.user.id });
                });
            });

            httpServer.listen(resolve); // Resolve the promise when the server is ready
        });
    });

    // --- Teardown ---
    afterAll(() => {
        io.close();
        httpServer.close();
    });

    // --- Client Connection Setup/Teardown for each test ---
    beforeEach((done) => {
        // Connect user one before each test
        const port = httpServer.address().port;
        clientSocketOne = new Client(`http://localhost:${port}`, {
            auth: { token: userOneToken }
        });
        clientSocketOne.on('connect', done);
    });

    afterEach(() => {
        // Disconnect clients after each test
        if (clientSocketOne) clientSocketOne.disconnect();
        if (clientSocketTwo) clientSocketTwo.disconnect();
    });


    // --- Tests ---
    test('should allow an authenticated user to send and another user to receive a private message', (done) => {
        // Arrange: Have userTwo listen for a message
        const port = httpServer.address().port;
        clientSocketTwo = new Client(`http://localhost:${port}`, {
            auth: { token: userTwoToken }
        });

        clientSocketTwo.on('privateMessage', (message) => {
            // Assert
            expect(message.content).toBe('Hello, UserTwo!');
            expect(message.senderId).toBe(userOne.id.toString());
            done(); // Test is finished
        });

        // Act: Have userOne send the message once userTwo is connected
        clientSocketTwo.on('connect', () => {
            clientSocketOne.emit('privateMessage', {
                recipientId: userTwo.id,
                content: 'Hello, UserTwo!',
            });
        });
    });

    test('should save private messages to the database', async () => {
        // Act: userOne sends a message
        clientSocketOne.emit('privateMessage', {
            recipientId: userTwo.id,
            content: 'Message for DB test',
        });

        // Assert: Wait a moment for the DB write, then check
        await new Promise(resolve => setTimeout(resolve, 100)); // A short delay
        const message = await Message.findOne({ content: 'Message for DB test' });
        
        expect(message).not.toBeNull();
        expect(message.sender.toString()).toBe(userOne.id.toString());
    });
});