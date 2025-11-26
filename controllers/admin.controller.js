import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import File from '../models/File.js';
import Payment from '../models/Payment.js';
import cloudinary from '../config/cloudinary.js';
import Category from '../models/Category.js';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';


export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

export const getAllFiles = asyncHandler(async (req, res) => {
  const files = await File.find().populate('creator', 'name email');
  res.json(files);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  await user.deleteOne();
  res.json({ message: 'User successfully deleted' });
});


// Delete any file
export const deleteFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const file = await File.findById(fileId);
  if (!file) return res.status(404).json({ message: 'File not found' });

  // Delete from cloudinary if exists
  if (file.cloudinary_id) await cloudinary.uploader.destroy(file.cloudinary_id);
  if (file.previewImage_id) await cloudinary.uploader.destroy(file.previewImage_id);

  await file.deleteOne();
  res.json({ message: 'File deleted successfully' });
});

// View all payments
export const getAllPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find()
    .populate('user', 'name email')
    .populate('file', 'title price');
  res.json({ payments });
});


// Create new category
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Category name is required" });
  }

  const existing = await Category.findOne({ name });
  if (existing) {
    return res.status(400).json({ message: "Category already exists" });
  }

  const category = await Category.create({ name, description });
  res.status(201).json({ message: "Category created", category });
});

// Get all categories
export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find();
  res.json(categories);
});


export const deleteAllUsers = asyncHandler(async (req, res) => {
  await User.deleteMany({});
  res.json({ message: 'All users deleted' });
});

export const deleteAllFiles = asyncHandler(async (req, res) => {
  await File.deleteMany({});
  res.json({ message: 'All files deleted' });
});

export const deleteAllPayments = asyncHandler(async (req, res) => {
  await Payment.deleteMany({});
  res.json({ message: 'All payments deleted' });
});

export const deleteAllChats = asyncHandler(async (req, res) => {
  await Chat.deleteMany({});
  res.json({ message: 'All chats deleted' });
});