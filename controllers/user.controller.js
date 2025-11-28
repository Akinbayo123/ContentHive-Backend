// controllers/user.controller.js
import User from '../models/User.js';
import File from '../models/File.js';
import Category from '../models/Category.js';
import Payment from '../models/Payment.js';
import asyncHandler from 'express-async-handler';
import axios from 'axios';
import path from 'path';
import Favourite from '../models/Favourite.js';
import { PAYSTACK_SECRET_KEY, BASE_URL } from '../config/env.js';

import crypto from 'crypto';


// Destructure purchase-related functions from the custom hook


// Get logged-in user profile
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json(user);
});

// Update profile (cannot update email)
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, password, currentPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (req.body.email && req.body.email !== user.email) {
    return res.status(400).json({ message: 'Email cannot be changed' });
  }

  user.name = name;

  if (password && password.trim() !== '') {
    user.password = password;
  }
  await user.save();
  res.json({ message: 'Profile updated successfully', user });
});


// Get all categories
export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find();
  res.status(200).json(categories);
});

// Get all available files uploaded by creators
export const getAllFiles = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, search = '', author, category, sort } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  const query = {};
  // Search by title
  if (search) {
    query.title = { $regex: search, $options: 'i' };
  }
  // Filter by author
  if (author) {
    query.creator = author;
  }
  // Filter by category
  if (category) {
    query.category = category; // assuming category is the ObjectId
  }

  // Count total documents
  const total = await File.countDocuments(query);

  // Determine sort
  let sortOption = { createdAt: -1 }; // default: newest first
  if (sort === 'priceAsc') sortOption = { price: 1 };
  else if (sort === 'priceDesc') sortOption = { price: -1 };
  else if (sort === 'popular') sortOption = { views: -1 }; // most views

  // Fetch files with pagination, population, and sorting
  const files = await File.find({
    ...query,
    isAvailable: true
  })
    .populate([
      { path: 'creator', select: 'name email' },
      { path: 'category', select: 'name' }
    ])
    .sort(sortOption)
    .skip((page - 1) * limit)
    .limit(limit);


  res.status(200).json({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    files,
  });
});



//  Get file details by ID
export const getFileDetails = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  // Find file and increment view count automatically
  const file = await File.findOneAndUpdate(
    { slug },
    { $inc: { views: 1 } },     // increase view count
    { new: true }               // return updated file
  )
    .populate('creator', 'name email')
    .populate('category', 'name');

  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }

  // Get related files by same creator (excluding this one)
  const relatedFiles = await File.find({
    creator: file.creator._id,
    _id: { $ne: file._id },
  })
    .limit(5)
    .select('_id title price slug');

  res.json({
    file,
    relatedFiles,
  });
});

//Download purchased file
export const downloadPurchasedFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const userId = req.user._id;

  const payment = await Payment.findOne({
    user: userId,
    file: fileId,
    status: "success",
  });

  if (!payment) {
    return res.status(403).json({
      message: "You have not purchased this file",
    });
  }

  const file = await File.findById(fileId);

  if (!file) {
    return res.status(404).json({
      message: "File not found",
    });
  }

  // Simply redirect the browser to Cloudinary URL
  res.redirect(file.url);
});


// Purchase a file (initialize Paystack payment)
export const purchaseFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const userId = req.user._id;

  // Find file
  const file = await File.findById(fileId).populate("creator");
  if (!file) {
    return res.status(404).json({ message: "File not found" });
  }

  const currentPrice = file.price;

  //Idempotency key (unique for user + file + price)
  const idempotencyKey = `${userId}-${fileId}-${currentPrice}`;

  //Check for existing pending or successful payment
  const existingPayment = await Payment.findOne({
    idempotencyKey,
    status: { $in: ["pending", "success"] },
  });

  // If already purchased
  if (existingPayment?.status === "success") {
    return res
      .status(400)
      .json({ message: "You have already purchased this file" });
  }

  // If payment still pending, reuse the link
  if (existingPayment?.status === "pending") {
    return res.status(200).json({
      authorization_url: existingPayment.authorizationUrl,
      reference: existingPayment.transactionReference,
      amount: existingPayment.amount,
    });
  }

  // Clean up FAILED payments for same user+file+price
  await Payment.deleteMany({
    idempotencyKey,
    status: "failed",
  });

  // Create new payment
  const reference = `ref_${Date.now()}_${Math.floor(
    Math.random() * 1000
  )}`;
  const callback_url = `${process.env.BASE_URL}/api/v1/payment/verify/${reference}`;

  // Initialize Paystack payment
  const response = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email: req.user.email,
      amount: currentPrice * 100, // kobo
      callback_url,
      metadata: { userId, fileId },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey, // ensures paystack doesn't double-charge
      },
    }
  );

  // Save new payment record
  const payment = await Payment.create({
    user: userId,
    file: fileId,
    amount: currentPrice,
    creator: file.creator._id,
    status: "pending",
    transactionReference: reference,
    paymentGatewayReference: response.data.data.reference,
    idempotencyKey,
    authorizationUrl: response.data.data.authorization_url,
  });

  // Send response to frontend
  return res.status(200).json({
    authorization_url: payment.authorizationUrl,
    reference: payment.transactionReference,
    amount: payment.amount,
  });
});


// Get user's favourite files 
export const getFavourites = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get favourites with only available files
  const favourites = await Favourite.find({ user: userId })
    .populate({
      path: "file",
      match: { isAvailable: true }, // ONLY AVAILABLE FILES
      populate: {
        path: "creator",
        select: "name",
      },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Remove favourites with null files (unavailable ones)
  const cleanFavourites = favourites.filter(fav => fav.file);

  // Correct total count to reflect only visible favourites
  const total = cleanFavourites.length;

  res.status(200).json({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    favourites: cleanFavourites,
  });
});


// Add file to favourites
export const addToFavourites = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const userId = req.user._id;
  const file = await File.findById(fileId);
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }
  const existingFavourite = await Favourite.findOne({ user: userId, file: fileId });
  if (existingFavourite) {
    return res.status(400).json({ message: 'File already in favourites' });
  }
  const favourite = new Favourite({ user: userId, file: fileId });
  await favourite.save();
  res.status(201).json({ message: 'File added to favourites' });
});

// Remove file from favourites
export const removeFromFavourites = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const userId = req.user._id;
  const favourite = await Favourite.findOneAndDelete({ user: userId, file: fileId });
  if (!favourite) {
    return res.status(404).json({ message: 'Favourite not found' });
  }
  res.status(200).json({ message: 'File removed from favourites' });
});

// Get user's successful purchases
export const getUserSuccessfulPurchases = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const purchases = await Payment.find({ user: userId, status: 'success' })
    .populate('file', '_id title price slug url')
    .sort({ createdAt: -1 }); // latest first
  res.status(200).json(purchases);
});

// Get all user's purchases 
export const getUserAllPurchases = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Query params
  const {
    search,           // search by file title
    sortBy = "createdAt", // default sort field
    order = "desc",       // default sort order
    page = "1",           // default page
    limit = "10"          // default page size
  } = req.query;

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);

  // Build filter object
  const filter = { user: userId };

  if (search) {
    // search by file title (case-insensitive)
    filter['file.title'] = { $regex: search, $options: 'i' };
  }



  // Build sort object
  const sort = {};
  sort[sortBy] = order === "asc" ? 1 : -1;

  // Count total documents
  const total = await Payment.countDocuments(filter);

  // Fetch paginated results
  let purchases = await Payment.find({ user: userId })
    .populate('file', '_id title price slug url creator')
    .sort(sort)
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  if (search) {
    purchases = purchases.filter(p => p.file.title.toLowerCase().includes(search.toLowerCase()));
  }

  res.status(200).json({
    total,
    page: pageNumber,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    purchases,
  });
});



// GET /users/dashboard
export const getUserDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Total purchases
  const totalPurchases = await Payment.countDocuments({ user: userId, status: 'success' });

  // Total favourites
  const totalFavourites = await Favourite.countDocuments({ user: userId });

  // Total amount spent
  const purchases = await Payment.find({ user: userId, status: 'success' });
  const totalAmountSpent = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Five recent purchases
  const recentPurchases = await Payment.find({ user: userId, status: 'success' })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate({
      path: 'file',
      select: 'title price creator previewImage',
      populate: {
        path: 'creator',      // nested populate
        select: 'name'        // only get the name of the creator
      }
    })

  res.json({
    totalPurchases,
    totalFavourites,
    totalAmountSpent,
    recentPurchases
  });
});

export const increaseContentViews = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  const updatedFile = await File.findByIdAndUpdate(
    fileId,
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!updatedFile) {
    return res.status(404).json({ message: "File not found" });
  }

  res.status(200).json({
    message: "View count updated",
    file: updatedFile
  });
});

