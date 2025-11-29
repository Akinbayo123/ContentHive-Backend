import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'uploads',
    resource_type: 'auto',
    allowed_formats: [
      'jpg', 'png', 'jpeg', 'gif',
      'mp3', 'mp4', 'mpa',
      'pdf'
    ],
  },
});

const parser = multer({ storage });

export default parser;
