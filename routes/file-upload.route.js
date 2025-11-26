import express from 'express';
import parser from '../middlewares/multer.middleware.js';

import { isAuthenticated } from '../middlewares/auth.middleware.js'; // middleware to verify JWT
import { uploadFile } from '../controllers/file-upload.controller.js';
import { validateRequest } from '../middlewares/validation.js';
import { fileUploadRules } from '../validations/file-upload.js';
const fileUploadRoutes = express.Router();

// Upload file
fileUploadRoutes.post('/upload', parser.single('file'), validateRequest(fileUploadRules), isAuthenticated,
uploadFile);

export default fileUploadRoutes;
