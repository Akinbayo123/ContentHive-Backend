import { body } from 'express-validator';
import User from '../models/User.js';

export const profileUpdateRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Please provide name to update'),

  body('password')
    .custom((value, { req }) => {
      if (req.body.currentPassword && !value) {
        throw new Error('Please provide new password to change password');
      }
      return true;
    })
    .optional()
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),

  body('currentPassword')
    .custom(async (value, { req }) => {

      if (value && !req.body.password) {
        throw new Error('Please provide new password to change password');
      }

      if (req.body.password && !value) {
        throw new Error('Please provide current password to change password');
      }

      if (value && req.body.password) {
        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
          throw new Error('User not found');
        }

        const isMatch = await user.matchPassword(value);
        if (!isMatch) {
          throw new Error('Current password is incorrect');
        }
      }

      return true;
    }),
];
