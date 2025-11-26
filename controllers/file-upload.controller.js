import parser from '../middlewares/multer.middleware.js';
import asyncHandler from 'express-async-handler';
import File from '../models/File.js';

export const uploadFile=asyncHandler(async  (req, res) => {
try {
    const { title, description, price } = req.body;

    if (!title || !price) {
      return res.status(400).json({ message: 'Title and price are required' });
    }

    const file = await File.create({
      title,
      description,
      url: req.file.path,
      cloudinary_id: req.file.filename,
      price,
      creator: req.user._id,
    });

    res.status(201).json({ message: 'File uploaded successfully', file });
 
} catch (error) {   
    res.status(500).json({ message: 'Server error', error: error.message });
}});