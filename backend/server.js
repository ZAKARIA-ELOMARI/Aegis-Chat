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

// Import ephemeral data cleanup service
const { initializeCleanupScheduler } = require('./services/ephemeralData.service');

// Import all models to register them with Mongoose at startup.
require('./models/user.model');
require('./models/role.model');
require('./models/message.model');
require('./models/tokenBlocklist.model');
require('./models/session.model');
require('./models/securityLog.model');

// --- Database Connection ---
connectDB();

// Initialize ephemeral data cleanup scheduler
initializeCleanupScheduler();

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

// --- 1. MIDDLEWARES GLOBAUX (APPLIQUÉS À TOUTES LES REQUÊTES) ---
// <-- CHANGEMENT : Ces middlewares sont déplacés en haut, AVANT les routes
app.use(cookieParser());

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: 'http://localhost:5173', // Votre origine frontend
  credentials: true 
}));
app.use(express.json());
app.use(morgan('combined', { stream: logger.stream }));


const server = http.createServer(app); // <-- Create an HTTP server from our Express app

// --- Configure Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: "*", // Pour le dev, ou 'http://localhost:5173' en production
    methods: ["GET", "POST"]
  }
});

// ... (Toute votre logique Socket.IO (io.use, io.on) reste inchangée ici) ...
// Make io instance globally available for security logger
global.io = io;
let onlineUsers = {};
// --- Socket.IO Authentication Middleware ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication Error: No token provided.'));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication Error: Invalid token.'));
    }
    socket.user = decoded;
    next();
  });
});
// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  logger.info(`Authenticated user connected: ${socket.user.sub} with socket ID: ${socket.id}`);
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
  logger.info(`User ${socket.user.sub} connected. Adding to online users.`);
  onlineUsers[socket.user.sub] = socket.id;
  io.emit('updateOnlineUsers', Object.keys(onlineUsers));
  socket.join(socket.user.sub);
  logger.info(`User ${socket.user.sub} joined room ${socket.user.sub}`);
  socket.on('privateMessage', async ({ senderId, recipientId, content, fileUrl }) => {
  try {
    logger.info(`Received message from ${senderId} to ${recipientId}`, { hasFile: !!fileUrl });
      const conversationId = [senderId, recipientId].sort().join('_');
      const message = new Message({
        sender: senderId,
        recipient: recipientId,
        content: Buffer.from(content, 'utf-8'),
        fileUrl: fileUrl || null,
        conversationId: conversationId,
        deliveredAt: new Date()
      });
      const savedMessage = await message.save();
      io.to(recipientId).emit('privateMessage', {
        content: content.toString('utf-8'),
        fileUrl: fileUrl || null,
        senderId: socket.user.sub,
        messageId: savedMessage._id.toString()
      });
      socket.emit('messageDelivered', {
        messageId: savedMessage._id.toString(),
        deliveredAt: savedMessage.deliveredAt
      });
    } catch (error) {
      logger.error('Error handling private message:', { error: error.message, userId: socket.user.sub, recipientId });
    }
  });
  socket.on('messageRead', async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return;
      }
      if (message.recipient.toString() === socket.user.sub) {
        message.readAt = new Date();
        await message.save();
        io.to(message.sender.toString()).emit('messageRead', {
          messageId: messageId,
          readAt: message.readAt
        });
      }
    } catch (error) {
      logger.error('Error handling message read:', { error: error.message, messageId });
    }
  });
  socket.on('typing', ({ recipientId, isTyping }) => {
    io.to(recipientId).emit('typing', { senderId: socket.user.sub, isTyping });
  });
  socket.on('disconnect', () => {
    logger.info(`User ${socket.user.sub} disconnected.`);
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
    logger.info(`User ${socket.user.sub} disconnected. Removing from online users.`);
    delete onlineUsers[socket.user.sub];
    io.emit('updateOnlineUsers', Object.keys(onlineUsers));
  });
});
// ... (Fin de la logique Socket.IO) ...


const attachIo = (req, res, next) => {
  req.io = io;
  next();
};
app.use(attachIo);


// --- 2. ROUTES PUBLIQUES (SANS CSRF) ---
// <-- CHANGEMENT : Importation des contrôleurs/validateurs pour les routes publiques
const { authLimiter } = require('./middleware/rateLimiter.middleware');
const { loginRules, setInitialPasswordRules, handleValidationErrors } = require('./middleware/validators.middleware');
const {
  login,
  refreshToken,
  forgotPassword,
  resetPassword
} = require('./controllers/auth.controller');

// <-- CHANGEMENT : Définition des routes publiques AVANT la protection CSRF
app.post('/api/auth/login', authLimiter, loginRules(), handleValidationErrors, login);
app.post('/api/auth/refresh-token', refreshToken);
app.post('/api/auth/forgot-password', authLimiter, forgotPassword);
app.post('/api/auth/reset-password/:token', authLimiter, setInitialPasswordRules(), handleValidationErrors, resetPassword);


// --- 3. INITIALISATION ET ROUTES CSRF ---
// <-- CHANGEMENT : Déplacé après les routes publiques
const csrfProtection = csrf({ cookie: true });

// <-- CHANGEMENT : La route pour obtenir le jeton vient APRÈS l'initialisation de csrfProtection
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// <-- CHANGEMENT : La protection est appliquée globalement APRES les routes publiques/csrf
app.use(csrfProtection);


// --- 4. ROUTES PRIVÉES (PROTÉGÉES PAR CSRF) ---
// Session activity update middleware (for authenticated routes only)
const updateSessionActivity = require('./middleware/sessionActivity.middleware');
app.use(updateSessionActivity);

// --- Routes ---
// <-- CHANGEMENT : auth.routes.js ne contient plus que les routes privées
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