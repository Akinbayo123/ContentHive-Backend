// middlewares/validator.js
import { validationResult } from 'express-validator';

export const validateRequest = (rules) => {
  return async (req, res, next) => {
    // Run all rules
    await Promise.all(rules.map(rule => rule.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    next();
  };
};

