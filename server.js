import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import passport from 'passport';
import './config/passport.js';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import bodyParser from 'body-parser';
import errorHandler from './middlewares/error.middleware.js';
import oauthRoutes from './routes/oauth.route.js';
import fileUploadRoutes from './routes/file-upload.route.js';
import paystackRoutes from './routes/payment.routes.js';
import userRoutes from './routes/user.routes.js';
import creatorRoutes from './routes/creator.routes.js';
import adminRoutes from './routes/admin.routes.js';
import chatRoutes from './routes/chat.routes.js';
import { startTransactionPolling } from './jobs/checkPendingTransactions.js';
import { JWT_SECRET } from './config/env.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.send('API is running!');
});
app.use(passport.initialize());
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/oauth', oauthRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/creators', creatorRoutes);
app.use('/api/v1/payment', paystackRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/chats', chatRoutes);




// create HTTP server & socket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// make io accessible in controllers
app.set('io', io);

// Map socketId -> userId for presence
const onlineUsers = new Map();

// Middleware: authenticate socket using JWT passed in handshake.auth
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id).select('_id name email');
    if (!user) return next(new Error('User not found'));
    socket.user = { _id: user._id.toString(), name: user.name };
    return next();
  } catch (err) {
    return next(new Error('Authentication error'));
  }
});

// Socket events

io.on('connection', (socket) => {
  const userId = socket.user._id;
  onlineUsers.set(userId, socket.id);


  // Send the list of currently online users to THIS user (including everyone)
  const currentlyOnlineUsers = Array.from(onlineUsers.keys());

  // Send individual userOnline events for each currently online user
  currentlyOnlineUsers.forEach(onlineUserId => {
    socket.emit('userOnline', { userId: onlineUserId });
  });

  // Broadcast to ALL OTHER users that THIS user is now online
  socket.broadcast.emit('userOnline', { userId });

  socket.on('joinChat', (chatId) => {
    socket.join(chatId);

  });

  socket.on('leaveChat', (chatId) => {
    socket.leave(chatId);
    console.log(`User ${userId} left chat: ${chatId}`);
  });

  // typing indicator
  socket.on('typing', ({ chatId }) => {
    socket.to(chatId).emit('typing', { chatId, userId });
  });

  socket.on('stopTyping', ({ chatId }) => {
    socket.to(chatId).emit('stopTyping', { chatId, userId });
  });

  // message sent from client (optimistic) — also supported by REST controller which will emit newMessage
  socket.on('sendMessage', async (payload) => {

    const { chatId, text } = payload;

  });

  // message read receipt
  socket.on('messageRead', ({ chatId, messageId }) => {
    // notify other participants
    socket.to(chatId).emit('messageRead', { chatId, messageId, userId, readAt: new Date() });
    // optionally update DB (see controller below)
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    // Broadcast to ALL OTHER users that THIS user went offline
    socket.broadcast.emit('userOffline', { userId });
  });
});




app.use(errorHandler);
startTransactionPolling();
// Start server
// Start server properly with Socket.IO
const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`ContentHive is running on http://localhost:${PORT}`);
  await connectDB();
});

