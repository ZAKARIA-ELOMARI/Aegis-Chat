require('dotenv').config();
const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io'); 
const connectDB = require('./config/db.config');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const cors = require('cors'); 
const Message = require('./models/message.model');

const morgan = require('morgan');
const logger = require('./config/logger');


// Import all models to register them with Mongoose at startup.
require('./models/user.model');
require('./models/role.model');
require('./models/message.model');
require('./models/tokenBlocklist.model');
// --- Database Connection ---
connectDB();

const app = express();
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const server = http.createServer(app); // <-- Create an HTTP server from our Express app

// --- Configure Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: "*", // For development, allow any origin. In production, restrict this to your frontend's URL.
    methods: ["GET", "POST"]
  }
});

let onlineUsers = {};

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

  // --- Start of new logic ---
  // Add user to our tracking object
  logger.info(`User ${socket.user.id} connected. Adding to online users.`);
  onlineUsers[socket.user.id] = socket.id;

  // Emit the updated list of online users to everyone
  io.emit('updateOnlineUsers', Object.keys(onlineUsers));
  // --- End of new logic ---

  // Join a private room based on their user ID
  socket.join(socket.user.id);
  logger.info(`User ${socket.user.id} joined room ${socket.user.id}`);

  // Listen for a 'privateMessage' event
  socket.on('privateMessage', async ({ recipientId, content }) => {
    try {
      logger.info(`Received message from ${socket.user.id} to ${recipientId}`);

      // The 'content' is now expected to be an encrypted buffer from the client.
      // We remove the string validation. The client is responsible for encryption.

      // Create a consistent conversation ID
      const conversationId = [socket.user.id, recipientId].sort().join('_');

      // Create a new message document
      const message = new Message({
        sender: socket.user.id,
        recipient: recipientId,
        content: content, // Save the encrypted buffer directly
        conversationId: conversationId
      });

      // Save the message to the database
      await message.save();

      // Forward the encrypted payload to the recipient's private room
      io.to(recipientId).emit('privateMessage', {
        content,
        senderId: socket.user.id,
      });
    } catch (error) {
      logger.error('Error handling private message:', { error: error.message, userId: socket.user.id, recipientId });
    }
  });

  // --- Add a new listener for typing indicators ---
  socket.on('typing', ({ recipientId, isTyping }) => {
    // Forward the typing status directly to the recipient's room
    io.to(recipientId).emit('typing', { senderId: socket.user.id, isTyping });
  });
  // --- End of new listener ---

  socket.on('disconnect', () => {
    logger.info(`User ${socket.user.id} disconnected.`);
    
    // --- Start of new logic ---
    // Remove user from our tracking object
    logger.info(`User ${socket.user.id} disconnected. Removing from online users.`);
    delete onlineUsers[socket.user.id];
    
    // Emit the updated list of online users to everyone
    io.emit('updateOnlineUsers', Object.keys(onlineUsers));
    // --- End of new logic ---
  });
});


// --- Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json());
const attachIo = (req, res, next) => {
  req.io = io;
  next();
};
app.use(attachIo);
app.use(morgan('combined', { stream: logger.stream }));

// --- Routes ---
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes.js'));
app.use('/api/messages', require('./routes/message.routes.js'));
app.use('/api/files', require('./routes/file.routes.js'));
app.use('/api/ai', require('./routes/ai.routes.js'));
app.use('/api/admin', require('./routes/admin.routes.js')); 
app.use('/api/2fa', require('./routes/twoFactor.routes.js'));

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