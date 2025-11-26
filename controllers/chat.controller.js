import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import asyncHandler from 'express-async-handler';

// Create chat (called after successful purchase)
export const createChat = asyncHandler(async (req, res) => {
  const { fileId, creatorId } = req.body;
  const buyerId = req.user._id;

  // Prevent duplicate chat
  let chat = await Chat.findOne({
    participants: { $all: [buyerId, creatorId] },
    file: fileId,
  });

  if (!chat) {
    chat = await Chat.create({
      participants: [buyerId, creatorId],
      file: fileId,
    });
  }

  res.json(chat);
});

// Get user’s chats
export const getUserChats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const chats = await Chat.find({
    participants: userId,
  })
    .populate('participants', 'name email')
    .populate('file')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'name email' }
    })
    .sort({ updatedAt: -1 });

  res.json(chats);
});

export const getMessages = asyncHandler(async (req, res) => {
  const messages = await Message.find({ chatId: req.params.chatId })
    .populate('sender', 'name email')
    .sort({ createdAt: 1 });
  res.json(messages);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { chatId, text } = req.body;
  const senderId = req.user._id;

  const message = await Message.create({ chatId, sender: senderId, text });

  // update Chat.lastMessage
  await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

  const populated = await Message.findById(message._id).populate('sender', 'name email');

  // emit via socket.io
  const io = req.app.get('io');
  io.to(chatId).emit('newMessage', populated);

  res.status(201).json(populated);
});

// mark a message (or messages) as read by user
export const markMessagesRead = asyncHandler(async (req, res) => {
  const { chatId, messageIds } = req.body; // messageIds: array of ids
  const userId = req.user._id;

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ message: "No messageIds provided" });
  }

  // Update messages: add userId to readBy if not present
  await Message.updateMany(
    { _id: { $in: messageIds } },
    { $addToSet: { readBy: userId } }
  );

  // Emit read receipt with a readAt timestamp for clients to show "Seen time"
  const io = req.app.get('io');
  const readAt = new Date().toISOString();

  messageIds.forEach((mid) => {
    io.to(chatId).emit('messageRead', { chatId, messageId: mid, userId: userId.toString(), readAt });
  });

  res.json({ success: true });
});




