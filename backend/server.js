require('dotenv').config();
const express = require('express');
const http = require('http'); // <-- Import Node's built-in HTTP module
const { Server } = require('socket.io'); // <-- Import the Server class from socket.io
const connectDB = require('./config/db.config');
const jwt = require('jsonwebtoken'); // <-- Make sure this is at the top of the file
const cors = require('cors'); // <-- 1. IMPORT CORS
const Message = require('./models/message.model');

const morgan = require('morgan');
const logger = require('./config/logger');

// --- Database Connection ---
connectDB();

const app = express();
const server = http.createServer(app); // <-- Create an HTTP server from our Express app

// --- Configure Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: "*", // For development, allow any origin. In production, restrict this to your frontend's URL.
    methods: ["GET", "POST"]
  }
});

// --- Socket.IO Authentication Middleware ---
io.use((socket, next) => {
  // The client will send the token in the 'auth' object
  const token = socket.handshake.auth.token;

  // Check if token exists
  if (!token) {
    return next(new Error('Authentication Error: No token provided.'));
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication Error: Invalid token.'));
    }
    // If token is valid, attach the user info to the socket object
    socket.user = decoded.user;
    next();
  });
});

// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  // This code now only runs for AUTHENTICATED users
  logger.info(`Authenticated user connected: ${socket.user.id} with socket ID: ${socket.id}`);

  // Join a private room based on their user ID
  socket.join(socket.user.id);
  logger.info(`User ${socket.user.id} joined room ${socket.user.id}`);

  // Listen for a 'privateMessage' event
  socket.on('privateMessage', async ({ recipientId, content }) => {
  try {
    logger.info(`Private message from ${socket.user.id} to ${recipientId}: ${content}`);

    // Create a consistent conversation ID by sorting the two user IDs
    // This ensures the ID is the same regardless of who sends the message
    const conversationId = [socket.user.id, recipientId].sort().join('_');

    // Create a new message document
    const message = new Message({
      sender: socket.user.id,
      recipient: recipientId,
      content: content,
      conversationId: conversationId
    });

    // Save the message to the database
    await message.save();

    // Send the message only to the recipient's private room
    io.to(recipientId).emit('privateMessage', {
      content,
      senderId: socket.user.id,
    });
    } catch (error) {
      logger.error('Error handling private message:', { error: error.message, userId: socket.user.id, recipientId });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`User ${socket.user.id} disconnected.`);
  });
});


// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: logger.stream }));

// --- Routes ---
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes.js'));
app.use('/api/messages', require('./routes/message.routes.js'));
app.use('/api/files', require('./routes/file.routes.js'));
app.use('/api/ai', require('./routes/ai.routes.js'));
app.use('/api/admin', require('./routes/admin.routes.js')); // <-- CHECK FOR THIS LINE

const PORT = process.env.PORT || 8000;

app.get('/', (req, res) => {
  res.json({ message: "Welcome to the Aegis Chat backend! The API is running." });
});

// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  logger.info(`A user connected with socket ID: ${socket.id}`);

  // Listen for a 'chatMessage' event from a client
  socket.on('chatMessage', (msg) => {
    logger.info('Message received: ' + msg);
    // Broadcast the message to ALL connected clients
    io.emit('chatMessage', msg);
  });

  // Listen for the built-in 'disconnect' event
  socket.on('disconnect', () => {
    logger.info(`User with socket ID ${socket.id} disconnected.`);
  });
});


// --- Start Server ---
server.listen(PORT, () => {
  // We now listen on the 'server' object instead of the 'app' object
  logger.info(`Server is running on port ${PORT}.`);
});