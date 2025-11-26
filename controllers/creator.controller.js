
import File from '../models/File.js';
import Payment from '../models/Payment.js';
import asyncHandler from 'express-async-handler';
import cloudinary from '../config/cloudinary.js';
import Category from '../models/Category.js';



// Get all files uploaded by the creator
export const getMyFiles = asyncHandler(async (req, res) => {
  const {
    search,
    sort = "createdAt",
    order = "desc",
    page = 1,
    limit = 10
  } = req.query;

  // Search filter
  const query = {
    creator: req.user._id,
  };

  if (search) {

    const matchedCategories = await Category.find({
      name: { $regex: search, $options: "i" }
    }).select("_id");

    const categoryIds = matchedCategories.map(cat => cat._id);


    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { category: { $in: categoryIds } },  // search category name
      { price: isNaN(Number(search)) ? undefined : Number(search) } // search exact price
    ].filter(Boolean);
  }

  // Pagination values
  const pageNumber = parseInt(page);
  const pageSize = parseInt(limit);
  const skip = (pageNumber - 1) * pageSize;

  // Fetch data with populate, search, sorting, pagination
  const files = await File.find(query)
    .populate("category", "name")
    .sort({ [sort]: order === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(pageSize);

  // Total count for pagination metadata
  const total = await File.countDocuments(query);

  res.json({
    total,
    page: pageNumber,
    limit: pageSize,
    totalPages: Math.ceil(total / pageSize),
    data: files
  });
});

// Get a single file by slug
export const getFile = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const creatorId = req.user._id;

  // Find file by slug and creator, populate category name
  const file = await File.findOne({ slug, creator: creatorId }).populate('category', 'name');

  if (!file) {
    return res.status(404).json({ success: false, message: 'File not found or access denied' });
  }

  res.status(200).json({ success: true, file });
});

// Upload a new file

export const uploadFile = asyncHandler(async (req, res) => {
  try {
    const { title, description, price, category, isAvailable } = req.body;

    // Validate required fields
    if (!title || !price || !category || !req.files || !req.files.file) {
      return res.status(400).json({ message: 'Title, price, category, and main file are required' });
    }

    const mainFile = req.files.file[0];

    // Determine Cloudinary resource type
    const mimeType = mainFile.mimetype;
    let resourceType = 'raw'; // default for PDFs, audio, etc.
    if (mimeType.startsWith('image/')) resourceType = 'image';
    else if (mimeType.startsWith('video/')) resourceType = 'video';

    // Upload main file
    const mainFileResult = await cloudinary.uploader.upload(mainFile.path, {
      folder: 'uploads',
      resource_type: resourceType,
    });

    // Upload preview image if provided
    let previewImageUrl = '';
    let previewImageId = '';
    if (req.files.previewImage && req.files.previewImage[0]) {
      const previewFile = req.files.previewImage[0];
      const previewResult = await cloudinary.uploader.upload(previewFile.path, {
        folder: 'previews',
        resource_type: 'image', // always an image
      });
      previewImageUrl = previewResult.secure_url;
      previewImageId = previewResult.public_id;
    }

    // Save to database
    const file = await File.create({
      title,
      description,
      price,
      url: mainFileResult.secure_url,
      cloudinary_id: mainFileResult.public_id,
      previewImage: previewImageUrl,
      previewImage_id: previewImageId,
      creator: req.user._id,
      category,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
    });

    res.status(201).json({ message: 'File uploaded successfully', file });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a file
export const updateFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const { title, description, price, category, isAvailable } = req.body;

  const file = await File.findById(fileId);
  if (!file) return res.status(404).json({ message: 'File not found' });

  // Only creator can update
  if (file.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  // Update fields
  file.title = title || file.title;
  file.description = description || file.description;
  file.price = price || file.price;
  file.category = category || file.category;
  if (isAvailable !== undefined) file.isAvailable = isAvailable;

  // Update main file if new file uploaded
  if (req.files && req.files.file && req.files.file[0]) {
    const mainFile = req.files.file[0];

    // Delete old main file from Cloudinary
    if (file.cloudinary_id) {
      await cloudinary.uploader.destroy(file.cloudinary_id);
    }

    const result = await cloudinary.uploader.upload(mainFile.path, {
      folder: 'uploads',
    });

    file.url = result.secure_url;
    file.cloudinary_id = result.public_id;
  }

  // Update preview image if provided
  if (req.files && req.files.previewImage && req.files.previewImage[0]) {
    const preview = req.files.previewImage[0];

    // Delete old preview image from Cloudinary
    if (file.previewImage_id) {
      await cloudinary.uploader.destroy(file.previewImage_id);
    }

    const result = await cloudinary.uploader.upload(preview.path, {
      folder: 'previews',
    });

    file.previewImage = result.secure_url;
    file.previewImage_id = result.public_id;
  }

  await file.save();

  res.status(200).json({ message: 'File updated successfully', file });
});

export const changeFileAvailability = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const { isAvailable } = req.body;
  const file = await File.findOne({ _id: fileId, creator: req.user._id });
  if (!file) return res.status(404).json({ message: 'File not found or not yours' });

  file.isAvailable = isAvailable;
  await file.save();

  res.json({ message: 'File availability updated successfully', file });
});

// Delete a file
export const deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findOneAndDelete({ _id: req.params.fileId, creator: req.user._id });
  if (!file) return res.status(404).json({ message: 'File not found or not yours' });
  res.json({ message: 'File deleted successfully' });
});

// Get all payments related to this creator’s files
export const getMyPayments = asyncHandler(async (req, res) => {
  const creatorId = req.user._id;

  const {
    search,

    sortBy = "createdAt",
    order = "desc",
    page = 1,
    limit = 10,
    status
  } = req.query;

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);

  // Date range for current month
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  // Base match for creator payments
  const baseMatch = {
    "file.creator": creatorId
  };

  // Build search filter
  if (search) {
    baseMatch["file.title"] = { $regex: search, $options: "i" };
  }



  // Get ALL creator payments with file populated
  const paymentsQuery = Payment.find()
    .populate({
      path: 'file',
      match: { creator: creatorId },
      select: '_id title price slug creator'
    })
    .populate('user', 'name email')
    .sort({ [sortBy]: order === "asc" ? 1 : -1 });

  const allPayments = await paymentsQuery;

  // Filter only creator files
  const creatorPayments = allPayments.filter(p => p.file !== null);

  // Calculate Total Earned
  const totalEarned = creatorPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Calculate This Month's Earnings
  const thisMonthEarned = creatorPayments
    .filter(p => p.createdAt >= startOfMonth && p.createdAt <= endOfMonth)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Apply search & amount filtering
  let filteredPayments = creatorPayments;

  if (search) {
    filteredPayments = filteredPayments.filter(p =>
      p.file.title.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (status) {
    filteredPayments = filteredPayments.filter(p => p.status === status);
  }

  // Pagination
  const total = filteredPayments.length;
  const paginatedPayments = filteredPayments.slice(
    (pageNumber - 1) * pageSize,
    pageNumber * pageSize
  );

  res.json({
    summary: {
      totalEarned,
      thisMonthEarned
    },
    pagination: {
      total,
      page: pageNumber,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    },
    payments: paginatedPayments
  });
});

// Get all categories
export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find();

  res.status(200).json(categories);
});

// Creator Dashboard Stats
export const getCreatorDashboard = asyncHandler(async (req, res) => {
  const creatorId = req.user._id;

  // Total Contents
  const totalContents = await File.countDocuments({ creator: creatorId });

  // Total Views
  const totalViewsAgg = await File.aggregate([
    { $match: { creator: creatorId } },
    { $group: { _id: null, views: { $sum: "$views" } } }
  ]);
  const totalViews = totalViewsAgg[0]?.views || 0;

  // Total Earnings

  const totalEarningsAgg = await Payment.aggregate([
    { $match: { creator: creatorId } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const totalEarnings = totalEarningsAgg[0]?.total || 0;

  // Recent Uploads (latest 5)
  const recentUploads = await File.find({ creator: creatorId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("title previewImage slug price views sales createdAt");
  const totalSales = await Payment.aggregate([
    { $match: { creator: creatorId, status: 'success' } },
    { $group: { _id: null, sales: { $sum: 1 } } }
  ]);
  const salesCount = totalSales[0]?.sales || 0;

  return res.status(200).json({
    totalContents,
    totalViews,
    totalEarnings,
    salesCount,

    recentUploads,
  });
});
