// validations/auth.js
import { body } from 'express-validator';
import User from '../models/User.js';

export const loginRules = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const registerRules = [
  body('name')
    .notEmpty()
    .withMessage('Name is required'),
    body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .custom(async (value) => {
      // Check if email already exists
      const user = await User.findOne({ email: value });
      if (user) {
        return Promise.reject('Email is already in use');
      }
    }),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
];