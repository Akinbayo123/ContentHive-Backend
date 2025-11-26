import { body } from 'express-validator';
import File from '../models/File.js';

export const fileUploadRules = [
  // Title
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .custom(async (value, { req }) => {
      const fileId = req.params.fileId; // the ID of the file being updated
      const existingFile = await File.findOne({ title: value, _id: { $ne: fileId } });
      if (existingFile) {
        throw new Error('Title already exists. Please choose another.');
      }
      return true;
    }),
  // Description
  body('description')
    .notEmpty()
    .withMessage('Description is required'),

  // Price
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isNumeric()
    .withMessage('Price must be a number'),

  // Category
  body('category')
    .notEmpty()
    .withMessage('Category is required'),

];
