import express from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import {
  createChat,
  getUserChats,
  getMessages,
  sendMessage,
  markMessagesRead,
} from '../controllers/chat.controller.js';

const chatRoutes = express.Router();
chatRoutes.use(isAuthenticated);

chatRoutes.post('/create', createChat);
chatRoutes.get('/', getUserChats);
chatRoutes.get('/:chatId/messages', getMessages);
chatRoutes.post('/message', sendMessage);
chatRoutes.post('/mark-read', markMessagesRead);


export default chatRoutes;