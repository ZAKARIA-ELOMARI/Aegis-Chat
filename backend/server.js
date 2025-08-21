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
require('./models/session.model');
require('./models/securityLog.model');

// --- Database Connection ---
connectDB();

// Setup periodic session cleanup (every 6 hours)
const Session = require('./models/session.model');
setInterval(async () => {
  try {
    const result = await Session.cleanupOldSessions();
    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} old sessions`, {
        type: 'MAINTENANCE',
        deletedCount: result.deletedCount
      });
    }
  } catch (error) {
    logger.error('Error during session cleanup', {
      error: error.message,
      type: 'MAINTENANCE_ERROR'
    });
  }
}, 6 * 60 * 60 * 1000); // 6 hours in milliseconds

const app = express();
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const { SecurityLogger, SECURITY_EVENTS, RISK_LEVELS } = require('./utils/securityLogger.util');

app.use(cookieParser());

// CSRF protection middleware
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);
const server = http.createServer(app); // <-- Create an HTTP server from our Express app

// --- Configure Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: "*", // For development, allow any origin. In production, restrict this to your frontend's URL.
    methods: ["GET", "POST"]
  }
});

// Make io instance globally available for security logger
global.io = io;

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
    socket.user = decoded;
    next();
  });
});

// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  // This code now only runs for AUTHENTICATED users
  logger.info(`Authenticated user connected: ${socket.user.sub} with socket ID: ${socket.id}`);
  
  // Log security event for user connection
  SecurityLogger.logSecurityEvent(
    SECURITY_EVENTS.SESSION_CREATED,
    RISK_LEVELS.LOW,
    `User connected to chat system`,
    {
      userId: socket.user.sub,
      username: socket.user.username,
      socketId: socket.id,
      sessionType: 'WEBSOCKET'
    }
  );
  
  // --- Start of new logic ---
  // Add user to our tracking object
  logger.info(`User ${socket.user.sub} connected. Adding to online users.`);
  onlineUsers[socket.user.sub] = socket.id;

  // Emit the updated list of online users to everyone
  io.emit('updateOnlineUsers', Object.keys(onlineUsers));
  // --- End of new logic ---

  // Join a private room based on their user ID
  socket.join(socket.user.sub);
  logger.info(`User ${socket.user.sub} joined room ${socket.user.sub}`);

  // Listen for a 'privateMessage' event
  socket.on('privateMessage', async ({ senderId, recipientId, content }) => {
  try {
    logger.info(`Received message from ${senderId} to ${recipientId}`);

      // The 'content' is now expected to be an encrypted buffer from the client.
      // We remove the string validation. The client is responsible for encryption.

      // Create a consistent conversation ID
      const conversationId = [senderId, recipientId].sort().join('_');

      // Create a new message document
      const message = new Message({
        sender: senderId,
        recipient: recipientId,
        content: Buffer.from(content, 'utf-8'), // Save the encrypted buffer directly
        conversationId: conversationId,
        deliveredAt: new Date() // Mark as delivered when sent
      });

      // Save the message to the database
      const savedMessage = await message.save();

      // Forward the encrypted payload to the recipient's private room
      io.to(recipientId).emit('privateMessage', {
        content: content.toString('utf-8'), // Convert buffer back to string
        senderId: socket.user.sub,
        messageId: savedMessage._id.toString()
      });

      // Send delivery confirmation back to sender
      socket.emit('messageDelivered', {
        messageId: savedMessage._id.toString(),
        deliveredAt: savedMessage.deliveredAt
      });

    } catch (error) {
      logger.error('Error handling private message:', { error: error.message, userId: socket.user.sub, recipientId });
    }
  });

  // Listen for message read events
  socket.on('messageRead', async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return;
      }

      // Only the recipient can mark as read
      if (message.recipient.toString() === socket.user.sub) {
        message.readAt = new Date();
        await message.save();

        // Notify the sender that their message was read
        io.to(message.sender.toString()).emit('messageRead', {
          messageId: messageId,
          readAt: message.readAt
        });
      }
    } catch (error) {
      logger.error('Error handling message read:', { error: error.message, messageId });
    }
  });

  // --- Add a new listener for typing indicators ---
  socket.on('typing', ({ recipientId, isTyping }) => {
    // Forward the typing status directly to the recipient's room
    io.to(recipientId).emit('typing', { senderId: socket.user.sub, isTyping });
  });
  // --- End of new listener ---

  socket.on('disconnect', () => {
    logger.info(`User ${socket.user.sub} disconnected.`);
    
    // Log security event for user disconnection
    SecurityLogger.logSecurityEvent(
      SECURITY_EVENTS.SESSION_TERMINATED,
      RISK_LEVELS.LOW,
      `User disconnected from chat system`,
      {
        userId: socket.user.sub,
        username: socket.user.username,
        socketId: socket.id,
        sessionType: 'WEBSOCKET'
      }
    );
    
    // --- Start of new logic ---
    // Remove user from our tracking object
    logger.info(`User ${socket.user.sub} disconnected. Removing from online users.`);
    delete onlineUsers[socket.user.sub];
    
    // Emit the updated list of online users to everyone
    io.emit('updateOnlineUsers', Object.keys(onlineUsers));
    // --- End of new logic ---
  });
});


// --- Middleware ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], // Only allow content from your own domain by default
      scriptSrc: ["'self'"], // Allow scripts from your own domain only
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow CSS from your domain and inline styles (needed for React/Vite)
      imgSrc: ["'self'", "data:", "blob:"], // Allow images from your domain, data URIs (QR codes), and blob URLs (file uploads)
      connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*"], // Allow WebSocket connections for Socket.IO
      fontSrc: ["'self'", "data:"], // Allow fonts from your domain and data URIs
      objectSrc: ["'none'"], // Disable plugins like Flash
      mediaSrc: ["'self'", "blob:"], // Allow media files from your domain and blob URLs
      frameSrc: ["'none'"], // Disable iframes
      baseUri: ["'self'"], // Restrict base tag to your domain
      formAction: ["'self'"], // Restrict form submissions to your domain
    },
  },
  crossOriginEmbedderPolicy: false, // Disable COEP for Socket.IO compatibility
}));
app.use(cors({
  origin: 'http://localhost:5173', // Your React app's origin
  credentials: true // Allow cookies to be sent
}));
app.use(express.json());
const attachIo = (req, res, next) => {
  req.io = io;
  next();
};
app.use(attachIo);
app.use(morgan('combined', { stream: logger.stream }));

// Session activity update middleware (for authenticated routes only)
const updateSessionActivity = require('./middleware/sessionActivity.middleware');
app.use(updateSessionActivity);

// An endpoint for the frontend to get the CSRF token
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// --- Routes ---
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes.js'));
app.use('/api/messages', require('./routes/message.routes.js'));
app.use('/api/files', require('./routes/file.routes.js'));
app.use('/api/ai', require('./routes/ai.routes.js'));
app.use('/api/admin', require('./routes/admin.routes.js')); 
app.use('/api/admin', require('./routes/securityLogs.routes.js')); // Security logs under admin
app.use('/api/2fa', require('./routes/twoFactor.routes.js'));
app.use('/api/sessions', require('./routes/session.routes.js'));

const PORT = process.env.PORT || 8000;

app.get('/', (req, res) => {
  res.json({ message: "Welcome to the Aegis Chat backend! The API is running." });
});

// --- Start Server ---
server.listen(PORT, () => {
  // We now listen on the 'server' object instead of the 'app' object
  logger.info(`Server is running on port ${PORT}.`);
});